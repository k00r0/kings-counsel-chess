// One game of chess: the board, the clocks, the engine, the opponent and the coach,
// wired together. The UI subscribes to `state` and calls the methods; nothing here touches the DOM.
import { Chess } from 'chess.js';
import { judge, explainMistake, findThreat, describeMove, readOpponentMove, pov, winChance } from '../chess/analysis.js';
import { chooseMove, thinkTime, profile } from '../chess/opponent.js';
import { pieceMap, phase, material, other, uciToMove, sanOf, VALUE } from '../chess/core.js';
import { isMateScore } from '../chess/engine.js';
import { developmentFacts } from '../coach/coach.js';

const RANK = { best: 0, good: 1, inaccuracy: 2, mistake: 3, blunder: 4 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const winPct = cp => 50 + 50 * winChance(cp);
const moveAccuracy = (before, after) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, before - after)) - 3.1669));

export class GameController {
  /**
   * opts: { engine, coach, playerColor 'w'|'b', mode 'coached'|'test', tc: { base, inc } (ms) | null,
   *         oppElo, kids, takebacks (number, Infinity for unlimited), depth, rng, fen }
   */
  constructor(opts) {
    Object.assign(this, { depth: 12, rng: Math.random, takebacks: 3 }, opts);
    this.chess = new Chess(opts.fen || undefined);
    this.startFen = this.chess.fen();
    if (opts.moves) for (const m of opts.moves) { try { this.chess.move(m); } catch (e) { break; } }  // resuming a saved game
    this.gen = 0;
    this.subs = new Set();
    this.speaking = false;
    this.records = [];           // one per player move (kept even if taken back, flagged)
    this.oppFacts = null;
    this.easeAcc = 0;
    this.pre = null;
    this.minEval = 0;
    this.helpUsed = 0;
    this.takebacksUsed = 0;
    this.clockLowSaid = false;
    this.state = {
      fen: this.chess.fen(), lastMove: null, check: false, history: [],
      playerColor: this.playerColor, status: 'playing', result: null,
      clocks: this.tc ? { w: this.tc.base, b: this.tc.base } : null, running: null,
      coach: null, arrows: [], marks: [], busy: null, awaiting: false,
      takebacks: this.takebacks, eval: 0, thinking: false,
    };
    this.tick = setInterval(() => this.clockTick(), 100);
    this.lastTick = Date.now();
  }

  // ------------------------------------------------------------- plumbing
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit() { this.state = { ...this.state }; this.subs.forEach(f => f(this.state)); }
  set(patch) { Object.assign(this.state, patch); this.emit(); }
  get opp() { return other(this.playerColor); }
  get coached() { return this.mode === 'coached'; }
  isPlayersTurn() { return this.chess.turn() === this.playerColor; }
  destroy() { this.gen++; clearInterval(this.tick); this.subs.clear(); }

  say(out) {
    if (!out || !out.text) return;
    this.set({ coach: { text: out.text, mood: out.mood || 'calm', options: out.options || null, id: Math.random() }, arrows: out.arrows || [], marks: out.marks || [] });
  }
  /** The UI tells us when the coach's voice starts and stops, so the clock can wait for him. */
  setSpeaking(on) { this.speaking = on; }

  clockTick() {
    const now = Date.now(), dt = now - this.lastTick;
    this.lastTick = now;
    const s = this.state;
    if (!s.clocks || !s.running || s.status !== 'playing') return;
    // the clock never runs while the coach is talking or waiting for the player's answer
    if (s.running === this.playerColor && (this.speaking || s.awaiting || s.busy === 'checking')) return;
    const left = Math.max(0, s.clocks[s.running] - dt);
    s.clocks = { ...s.clocks, [s.running]: left };
    if (left === 0) return this.finish('time', s.running === this.playerColor ? this.opp : this.playerColor);
    if (s.running === this.playerColor && left < 30000 && !this.clockLowSaid && this.coached) { this.clockLowSaid = true; this.say(this.coach.clockLow()); }
    this.emit();
  }

  syncBoard() {
    const c = this.chess;
    const h = c.history({ verbose: true });
    const last = h[h.length - 1];
    Object.assign(this.state, { fen: c.fen(), check: c.inCheck(), lastMove: last ? [last.from, last.to] : null, history: h.map(m => ({ san: m.san, color: m.color, from: m.from, to: m.to, piece: m.piece, captured: m.captured, flags: m.flags, promotion: m.promotion })) });
  }

  // ------------------------------------------------------------- flow
  async start(intro) {
    await this.engine.newGame();
    this.syncBoard();
    if (intro) this.say(intro);
    if (this.isPlayersTurn()) { this.prepare(); this.set({ running: this.playerColor }); }
    else this.opponentTurn(null);
  }

  /** Analyse the position the player is about to move in (best moves + what the opponent threatens). */
  prepare() {
    const fen = this.chess.fen();
    const engine = this.engine, test = !this.coached;
    this.pre = (async () => {
      const a = await engine.analyze(fen, { depth: this.depth, multipv: 3 });
      const cp = a.lines[0] ? a.lines[0].cp : 0;
      const threat = test ? null : await findThreat(engine, fen, cp, Math.min(10, this.depth - 2));
      return { fen, lines: a.lines, threat };
    })();
    return this.pre;
  }

  async playerMove(move) {
    const s = this.state;
    if (s.status !== 'playing' || !this.isPlayersTurn() || s.busy || s.awaiting) return false;
    const fenBefore = this.chess.fen();
    let mv;
    try { mv = this.chess.move(move); } catch (e) { return false; }
    if (!mv) return false;
    const gen = ++this.gen;
    const afterTakeback = this.justTookBack; this.justTookBack = false;
    this.syncBoard();
    this.set({ running: null, busy: 'checking', arrows: [], marks: [], coach: s.coach && s.coach.options ? null : s.coach });

    const pre = await this.pre;
    if (gen !== this.gen) return true;
    const uci = mv.from + mv.to + (mv.promotion || '');
    const over = this.chess.isGameOver();
    const post = over ? { lines: [] } : await this.engine.analyze(this.chess.fen(), { depth: this.depth, multipv: Math.max(3, profile(this.oppElo).multipv) });
    if (gen !== this.gen) return true;

    const me = this.playerColor;
    let bestLine = pre.lines[0];
    let afterCp = this.chess.isCheckmate() ? (me === 'w' ? 99900 : -99900) : post.lines[0] ? post.lines[0].cp : bestLine ? bestLine.cp : 0;
    let bestCp = bestLine ? bestLine.cp : afterCp;
    let verdict = bestLine && bestLine.move === uci ? { loss: 0, cpLoss: 0, kind: 'best' } : judge(bestCp, afterCp, me);
    let mateMissed = bestLine && isMateScore(bestLine.cp) && pov(bestLine.cp, me) > 0 && !(isMateScore(afterCp) && pov(afterCp, me) > 0);

    // Second opinion: before the coach calls a move a mistake or recommends another move, a much deeper
    // analysis must agree. The milder of the two verdicts wins, and the recommended move is the deep one.
    const wouldComment = verdict.kind === 'mistake' || verdict.kind === 'blunder' || mateMissed || (verdict.kind === 'inaccuracy' && this.coached && this.help <= 2);
    let afterLine = post.lines[0];
    if (wouldComment && !over && this.verify !== false) {
      const deep = await this.secondOpinion(fenBefore, this.chess.fen(), uci);
      if (gen !== this.gen) return true;
      if (deep) {
        const v2 = deep.playedIsBest ? { loss: 0, cpLoss: 0, kind: 'best' } : judge(deep.bestCp, deep.afterCp, me);
        verdict = RANK[v2.kind] < RANK[verdict.kind] ? v2 : { ...verdict, loss: Math.min(verdict.loss, v2.loss), cpLoss: Math.min(verdict.cpLoss, v2.cpLoss) };
        bestLine = deep.bestLine; bestCp = deep.bestCp; afterCp = deep.afterCp; afterLine = deep.afterLine;
        mateMissed = mateMissed && isMateScore(bestCp) && pov(bestCp, me) > 0 && !(isMateScore(afterCp) && pov(afterCp, me) > 0);
        // small "X was a bit better" tips only when the gain is real and the game isn't already decided
        if (verdict.kind === 'inaccuracy' && (verdict.cpLoss < 80 || Math.abs(pov(bestCp, me)) > 500)) verdict = { ...verdict, kind: 'good' };
        // the opponent sees the deep answer too, so a real blunder gets punished
        if (afterLine) post.lines = [afterLine, ...post.lines.filter(l => l.move !== afterLine.move)];
      }
    }
    const facts = describeMove(fenBefore, uci);
    const bad = verdict.kind === 'mistake' || verdict.kind === 'blunder';
    const why = (bad || mateMissed) && bestLine ? explainMistake({ fenBefore, played: uci, bestLine, afterLine, priorThreat: pre.threat }) : null;
    const bestSan = bestLine ? sanOf(fenBefore, bestLine.move) : null;
    const reply = post.lines[0];
    const recapture = !!(reply && reply.move.slice(2, 4) === mv.to);

    const rec = {
      ply: this.chess.history().length, moveNo: Math.ceil(this.chess.history().length / 2), san: mv.san, uci, fenBefore,
      kind: verdict.kind, loss: verdict.loss, before: pov(bestCp, me), after: pov(afterCp, me),
      acc: moveAccuracy(winPct(pov(bestCp, me)), winPct(pov(afterCp, me))),
      theme: why ? why.theme : null, detail: why ? why.detail : null, best: bestLine ? bestLine.move : null, bestSan,
      phase: phase(pieceMap(new Chess(fenBefore))), piece: mv.piece, captured: mv.captured || null, check: facts && facts.check,
      fork: facts && facts.fork, castle: facts && facts.castle, takenBack: false, afterTakeback,
    };
    this.records.push(rec);
    this.set({ busy: null, eval: rec.after });
    this.minEval = Math.min(this.minEval, rec.after);

    if (over) return this.finish(), true;

    const out = this.coach.afterPlayerMove({
      fenBefore, facts, verdict, why, color: me, pre: pre.lines, post: post.lines, priorThreat: pre.threat,
      canTakeBack: this.state.takebacks > 0, afterTakeback, bestSan, bestUci: bestLine && bestLine.move, recapture, ply: rec.ply,
    });
    if (out && out.intervene && this.coached) {
      this.pending = { post, why, rec, fenBefore, reply, bestLine, bestSan, moved: mv };
      this.set({ awaiting: true });
      this.say(out);
      return true;
    }
    if (out) this.say(out);
    this.opponentTurn(post);
    return true;
  }

  /** A deeper, independent look at the position before and after the player's move. */
  async secondOpinion(fenBefore, fenAfter, uci) {
    const depth = this.kids ? 16 : 18, movetime = 2500;
    const before = await this.engine.analyze(fenBefore, { depth, movetime, multipv: 2 });
    const b = before.lines[0];
    if (!b) return null;
    if (b.move === uci) return { playedIsBest: true, bestLine: b, bestCp: b.cp, afterCp: b.cp, afterLine: null };
    const after = await this.engine.analyze(fenAfter, { depth: depth - 1, movetime });
    const a = after.lines[0];
    if (!a) return null;
    return { playedIsBest: false, bestLine: b, bestCp: b.cp, afterCp: a.cp, afterLine: a };
  }

  /** The player's answer to an intervention. */
  choose(option) {
    const p = this.pending;
    if (!p) return;
    if (option === 'show') {
      const replySan = p.reply ? sanOf(this.chess.fen(), p.reply.move) : null;
      const out = this.coach.showMe({ why: p.why, replyUci: p.reply && p.reply.move, replySan, bestUci: p.bestLine && p.bestLine.move, bestSan: p.bestSan });
      const opts = (this.state.coach && this.state.coach.options || []).filter(o => o !== 'show');
      this.say({ ...out, options: opts.length ? opts : ['playon'] });
      return;
    }
    if (option === 'takeback' && this.state.takebacks > 0) {
      this.gen++;
      this.chess.undo();
      p.rec.takenBack = true;
      this.pending = null;
      this.justTookBack = true;
      this.takebacksUsed++;
      const left = this.state.takebacks - 1;
      this.syncBoard();
      // which square to light up for the young ones: the piece that's in danger
      const d = p.why && p.why.detail || {};
      const danger = d.moved ? p.moved.from : d.sq && this.chess.get(d.sq) ? d.sq : null;
      this.set({ awaiting: false, takebacks: left, running: this.playerColor, arrows: [], marks: [] });
      this.say(this.coach.afterTakeback({ last: left === 0 && Number.isFinite(left), danger }));
      return;
    }
    // play on
    this.pending = null;
    this.set({ awaiting: false });
    this.say(this.coach.playOn());
    this.opponentTurn(p.post);
  }

  ease() {
    if (!this.coached) return 0;
    const cp = this.state.eval;
    // only a gentle nudge, and only while the player is clearly behind
    if (cp < -250) this.easeAcc = Math.min(0.4, this.easeAcc + 0.05);
    else if (cp > 0) this.easeAcc = Math.max(0, this.easeAcc - 0.2);
    return Math.min(0.6, (this.kids ? 0.3 : 0) + this.easeAcc);
  }

  async opponentTurn(post) {
    const gen = ++this.gen;
    const c = this.chess;
    if (this.state.clocks && this.tc.inc && c.history().length) {
      // the player's increment, now that their move is final
      this.state.clocks = { ...this.state.clocks, [this.playerColor]: this.state.clocks[this.playerColor] + this.tc.inc };
    }
    this.set({ running: this.opp, thinking: true });
    const t0 = Date.now();
    const lines = post && post.lines.length ? post.lines : (await this.engine.analyze(c.fen(), { depth: this.depth, multipv: profile(this.oppElo).multipv })).lines;
    if (gen !== this.gen) return;
    const fenBefore = c.fen();
    const uci = chooseMove(fenBefore, lines, this.oppElo, { rng: this.rng, ease: this.ease() });
    let wait = thinkTime(this.oppElo, lines, this.rng);
    if (!this.tc) wait *= 0.8;
    else { const left = this.state.clocks[this.opp]; wait = Math.min(wait, left / 25); }
    if (c.history().length < 2) wait = Math.min(wait, 900);
    await sleep(Math.max(250, wait - (Date.now() - t0)));
    if (gen !== this.gen || this.state.status !== 'playing') return;

    c.move(uciToMove(uci));
    if (this.state.clocks && this.tc.inc) this.state.clocks = { ...this.state.clocks, [this.opp]: this.state.clocks[this.opp] + this.tc.inc };
    this.oppFacts = readOpponentMove(fenBefore, uci);
    this.syncBoard();
    this.set({ thinking: false, running: null });
    if (c.isGameOver()) return this.finish();

    const evalBefore = lines[0] ? pov(lines[0].cp, this.playerColor) : 0;
    this.set({ running: this.playerColor });
    const pre = await this.prepare();
    if (gen !== this.gen) return;
    const best = pre.lines[0];
    const after = best ? pov(best.cp, this.playerColor) : 0;
    this.set({ eval: after });
    const out = this.coach.afterOpponentMove({
      facts: this.oppFacts, threat: pre.threat, before: evalBefore, after, bestLine: best,
      bestFacts: best ? describeMove(c.fen(), best.move) : null, ply: c.history().length, color: this.playerColor, fen: c.fen(),
      dev: developmentFacts(c, this.playerColor), phase: phase(pieceMap(c)),
    });
    if (out) this.say(out);
  }

  // ------------------------------------------------------------- asking the coach
  async ask(kind) {
    if (this.state.status !== 'playing') return;
    this.helpUsed++;
    if (kind === 'why') return this.say(this.coach.explainOpp(this.oppFacts));
    if (!this.isPlayersTurn() || !this.pre) return this.say({ text: '...', mood: 'thinking' });
    const pre = await this.pre;
    if (kind === 'threat') return this.say(this.coach.threatAnswer(pre.threat));
    if (kind === 'hint') {
      // hints get the deep look too, so the coach never points at a weak move
      const deep = await this.engine.analyze(pre.fen, { depth: this.kids ? 16 : 18, movetime: 2500 });
      if (this.chess.fen() !== pre.fen) return;
      const b = deep.lines[0] || pre.lines[0];
      const f = b ? describeMove(pre.fen, b.move) : null;
      return this.say(this.coach.hint(pre.fen, f ? { piece: f.piece, from: f.from, san: f.san, uci: b.move } : null));
    }
    if (kind === 'plan') {
      const map = pieceMap(this.chess);
      const oppPieces = Object.values(map).filter(p => p.color === this.opp && p.type !== 'k' && p.type !== 'p').length;
      return this.say(this.coach.plan({ cp: this.state.eval, phase: phase(map), dev: developmentFacts(this.chess, this.playerColor), material: { oppPieces } }));
    }
  }

  /** Facts the AI coach gets when the player types a question. */
  context() {
    return {
      fen: this.chess.fen(), playerColor: this.playerColor, moves: this.chess.history().slice(-12),
      eval: this.state.eval, threat: null, lastOpp: this.oppFacts && this.oppFacts.san,
    };
  }

  /** Undo the last full move (coached games only, costs a take-back). */
  undo() {
    const s = this.state;
    if (!this.coached || s.status !== 'playing' || s.busy || s.awaiting || s.takebacks <= 0 || !this.isPlayersTurn()) return false;
    const h = this.chess.history();
    if (h.length < 2) return false;
    this.gen++;
    this.chess.undo(); this.chess.undo();
    const last = [...this.records].reverse().find(r => !r.takenBack);
    if (last) last.takenBack = true;
    this.takebacksUsed++;
    this.justTookBack = true;
    this.syncBoard();
    this.prepare();
    this.set({ takebacks: s.takebacks - 1, running: this.playerColor, arrows: [], marks: [], coach: null, thinking: false });
    return true;
  }

  resign() { if (this.state.status === 'playing') this.finish('resign', this.opp); }

  offerDraw() {
    const ply = this.chess.history().length;
    const ok = ply >= 30 && Math.abs(this.state.eval) <= 40;
    if (ok) this.finish('agreement', null);
    return ok;
  }

  // ------------------------------------------------------------- the end
  finish(reason, winner) {
    if (this.state.status === 'over') return;
    this.gen++;
    const c = this.chess;
    if (!reason) {
      if (c.isCheckmate()) { reason = 'checkmate'; winner = other(c.turn()); }
      else if (c.isStalemate()) reason = 'stalemate';
      else if (c.isInsufficientMaterial()) reason = 'insufficient';
      else if (c.isThreefoldRepetition()) reason = 'repetition';
      else reason = 'fifty';
      if (reason !== 'checkmate') winner = null;
    }
    const outcome = winner === this.playerColor ? 'win' : winner ? 'loss' : 'draw';
    this.pending = null;
    this.set({ status: 'over', running: null, awaiting: false, thinking: false, busy: null, result: { winner, reason, outcome } });
    const out = this.coach.end({ result: outcome, reason: reason === 'time' || reason === 'resign' ? reason : null, comeback: outcome === 'win' && this.minEval < -250 });
    this.say(out);
  }

  /** Compact record of the game for the journal, memory and reports. */
  summary() {
    const recs = this.records.filter(r => !r.takenBack);
    const all = this.records;
    const acc = recs.length ? recs.reduce((a, r) => a + r.acc, 0) / recs.length : 0;
    const phaseLoss = {};
    for (const ph of ['opening', 'middlegame', 'endgame']) {
      const rs = recs.filter(r => r.phase === ph);
      if (rs.length) phaseLoss[ph] = { moves: rs.length, acc: Math.round(rs.reduce((a, r) => a + r.acc, 0) / rs.length) };
    }
    const h = this.chess.history({ verbose: true });
    const mine = h.filter(m => m.color === this.playerColor);
    const castleIdx = mine.findIndex(m => m.flags.includes('k') || m.flags.includes('q'));
    return {
      date: new Date().toISOString(), mode: this.mode, color: this.playerColor, oppElo: this.oppElo,
      result: this.state.result && this.state.result.outcome, reason: this.state.result && this.state.result.reason,
      plies: h.length, accuracy: Math.round(acc),
      mistakes: all.filter(r => r.theme && (r.kind === 'mistake' || r.kind === 'blunder' || r.theme === 'missed_mate')).map(r => ({
        ply: r.ply, moveNo: r.moveNo, theme: r.theme, kind: r.kind, fen: r.fenBefore, played: r.san, best: r.best, bestSan: r.bestSan,
        piece: r.detail && r.detail.piece || r.piece, sq: r.detail && r.detail.sq || null, takenBack: r.takenBack, phase: r.phase,
      })),
      counts: {
        best: recs.filter(r => r.kind === 'best').length, good: recs.filter(r => r.kind === 'good').length,
        inaccuracy: recs.filter(r => r.kind === 'inaccuracy').length, mistake: recs.filter(r => r.kind === 'mistake').length,
        blunder: recs.filter(r => r.kind === 'blunder').length, moves: recs.length,
      },
      highlights: recs.filter(r => r.kind === 'best' && (r.fork || (r.captured && VALUE[r.captured] >= 3) || r.after > 90000)).slice(0, 4).map(r => ({ moveNo: r.moveNo, san: r.san, fork: r.fork, fen: r.fenBefore, mate: r.after > 90000 })),
      phaseAcc: phaseLoss,
      firstMoves: mine.slice(0, 3).map(m => m.san),
      captures: mine.filter(m => m.captured).length, checks: mine.filter(m => m.san.includes('+')).length,
      castledMove: castleIdx >= 0 ? castleIdx + 1 : null,
      takebacks: this.takebacksUsed, help: this.helpUsed, comeback: this.minEval < -250 && this.state.result && this.state.result.outcome === 'win',
      pgn: this.chess.pgn({ maxWidth: 0 }),
      startFen: this.startFen,
    };
  }
}
