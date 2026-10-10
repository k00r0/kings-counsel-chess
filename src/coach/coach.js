// The coach decides WHEN to speak and WHAT to say. It never invents chess facts:
// every line is built from engine numbers and board detectors (analysis.js), then
// voiced by the persona's phrase bank (voice.js) so it sounds like a person, not a log.
import { Voice } from './voice.js';
import { VIZIER, VIZIER_THEMES } from './vizier.js';
import { HOPPER, HOPPER_THEMES } from './hopper.js';
import { NAME, VALUE, pieceMap, loosePieces, phase } from '../chess/core.js';
import { Chess } from 'chess.js';
import { lastSeen, whenText } from './memory.js';
import { pov, winChance } from '../chess/analysis.js';
import { isMateScore } from '../chess/engine.js';

export const PERSONAS = {
  vizier: { id: 'vizier', name: 'The Vizier', bank: VIZIER, themes: VIZIER_THEMES, kids: false,
    buttons: { takeback: 'Take it back', show: 'Show me', playon: 'Play on', ok: 'Continue' } },
  hopper: { id: 'hopper', name: 'Hopper', bank: HOPPER, themes: HOPPER_THEMES, kids: true,
    buttons: { takeback: 'Try again!', show: 'Show me', playon: 'Keep going', ok: 'Okay!' } },
};

// how important a line is: 3 = always said, 0 = small talk
const NEED = { quiet: 3, normal: 2, chatty: 1 };

export class Coach {
  /**
   * opts: { persona, talk: 'quiet'|'normal'|'chatty', help: 1..3 (master..squire), mode: 'coached'|'test',
   *         memory, gameNo, name, opp, rng }
   */
  constructor(opts) {
    Object.assign(this, opts);
    this.p = PERSONAS[opts.persona] || PERSONAS.vizier;
    this.rng = opts.rng || Math.random;
    this.voice = new Voice(this.p.bank, opts.memory.usage, this.rng);
    this.silent = opts.mode === 'test';
    this.quietMoves = 0;          // full moves since the coach last spoke
    this.toldThisGame = new Set();
    this.themesThisGame = {};
    this.lastStatus = 0;          // -1 losing, 0 even, 1 winning
    this.hintLevel = 0; this.hintFen = null;
  }

  get kids() { return this.p.kids; }
  data(extra) { return { name: this.name, opp: this.opp, ...extra }; }
  line(key, extra) { return this.voice.say(key, this.data(extra)); }

  /** Should a line of this importance be spoken now? */
  wants(level) {
    if (this.silent) return false;
    const need = NEED[this.talk] || 2;
    if (level >= need) return true;
    if (level === need - 1) return this.quietMoves >= 2 || this.rng() < 0.35;
    if (level === need - 2) return this.quietMoves >= 3 && this.rng() < 0.4;
    return false;
  }
  spoke() { this.quietMoves = 0; }
  /** The same kind of remark isn't repeated within a few moves (urgent ones excepted). */
  cooling(key, ply, level) {
    this.lastKey = this.lastKey || {};
    const fam = key.replace(/_(explicit|vague)$/, '');
    if (level < 3 && this.lastKey[fam] !== undefined && ply - this.lastKey[fam] < 8) return true;
    this.lastKey[fam] = ply;
    return false;
  }

  // ---------------------------------------------------------------- game start
  start({ firstGame, lastResult, reminder }) {
    if (this.silent) return { text: this.line('greet_test'), mood: 'calm' };
    const parts = [];
    if (firstGame) parts.push(this.line('greet_first'));
    else if (lastResult === 'loss' && this.rng() < 0.6) parts.push(this.line('greet_after_loss'));
    else if (lastResult === 'win' && this.rng() < 0.6) parts.push(this.line('greet_after_win'));
    else parts.push(this.line('greet'));
    if (reminder) {
      const [theme, tip] = this.p.themes[reminder.theme] || [];
      if (theme) {
        const key = reminder.kind === 'pattern' ? 'memory_open_pattern' : reminder.kind === 'improving' ? 'memory_open_improving' : 'memory_open';
        const t = this.line(key, { theme, tip, count: reminder.count });
        if (t) parts.push(t);
      }
    }
    return { text: parts.filter(Boolean).join(' '), mood: 'happy' };
  }

  // ---------------------------------------------------------------- after the player's move
  /**
   * ctx: { fenBefore, facts (describeMove), verdict (judge), pre (lines before), post (lines after),
   *        why (explainMistake) | null, priorThreat, color, canTakeBack, afterTakeback, ply }
   * Returns { intervene, text, mood, arrows, marks } or null.
   */
  afterPlayerMove(ctx) {
    if (this.silent) return null;
    const { facts, verdict, why, color } = ctx;
    const bad = verdict.kind === 'mistake' || verdict.kind === 'blunder';
    const missedMate = why && why.theme === 'missed_mate' && why.detail.mateIn <= 2 && this.help >= 2;
    if ((bad || missedMate) && why) return this.intervention(ctx);

    // praise and notes
    let key = null, level = 0, extra = {};
    if (facts.mate) { key = 'praise_mate'; level = 3; }
    else if (ctx.afterTakeback && (verdict.kind === 'best' || verdict.kind === 'good')) { key = 'praise_after_takeback'; level = 3; }
    else if (facts.fork && verdict.kind === 'best') { key = 'praise_fork'; level = 2; extra.piece = NAME[facts.piece]; }
    else if (facts.captured && verdict.kind === 'best' && freeCapture(ctx)) { key = 'praise_capture'; level = VALUE[facts.captured] >= 3 ? 2 : 1; extra.took = NAME[facts.captured]; }
    else if (ctx.priorThreat && ctx.priorThreat.gain >= 250 && (verdict.kind === 'best' || verdict.kind === 'good')) { key = 'praise_defend'; level = ctx.priorThreat.gain >= 300 || ctx.priorThreat.mate ? 2 : 1; }
    else if (facts.newPins && facts.newPins.length && verdict.kind === 'best') { key = 'praise_pin'; level = 1; }
    else if (facts.castle) { key = 'praise_castle'; level = 1; }
    else if (verdict.kind === 'inaccuracy' && this.help <= 2) {
      key = 'inaccuracy'; level = 1; extra.best = ctx.bestSan;
    }
    else if (verdict.kind === 'best') { key = 'praise_best'; level = this.kids ? 1 : 0; }
    else if (verdict.kind === 'good') { key = 'praise_good'; level = 0; }
    if (!key || !this.wants(level) || this.cooling(key, ctx.ply, level)) return null;
    const text = this.line(key, extra);
    if (!text) return null;
    this.spoke();
    return { text, mood: key === 'inaccuracy' ? 'thinking' : 'happy', arrows: key === 'inaccuracy' && ctx.bestUci ? [{ uci: ctx.bestUci, color: 'good' }] : [] };
  }

  intervention(ctx) {
    const { why, color } = ctx;
    const d = why.detail || {};
    const theme = why.theme;
    const data = {
      piece: d.piece ? NAME[d.piece] : null, sq: d.sq, by: d.by ? NAME[d.by] : null, bySq: d.bySq,
      reply: d.reply, best: ctx.bestSan || d.best, took: d.took ? NAME[d.took] : null, n: d.mateIn,
    };
    if (theme === 'bad_trade') data.piece = NAME[d.piece];
    let key = 'iv_' + theme;
    if (theme === 'hang' && d.fork) key = 'iv_fork';
    else if (theme === 'hang' && d.pin) key = 'iv_pin';
    else if (theme === 'hang' && d.moved) key = 'iv_hang_moved';
    if (!this.voice.has(key)) key = 'iv_positional';

    const parts = [this.line('iv_open')];
    // memory: this game, earlier games
    const memo = this.memoryLine(theme, d);
    if (memo) parts.push(memo);
    parts.push(this.line(key, data) || this.line('iv_positional', data) || this.line('iv_missed_tactic', data));
    const offer = ctx.canTakeBack ? this.line('iv_offer') : this.line('iv_offer_none');
    if (offer) parts.push(offer);
    this.themesThisGame[theme] = (this.themesThisGame[theme] || 0) + 1;
    this.spoke();

    // what to highlight
    const marks = [];
    if (d.sq && (theme === 'hang' || theme === 'ignored_threat' || theme === 'bad_trade')) marks.push({ sq: d.sq, kind: 'danger' });
    if (this.kids && d.bySq) marks.push({ sq: d.bySq, kind: 'attacker' });
    return {
      intervene: true, theme, detail: d,
      text: parts.filter(Boolean).join(' '), mood: theme === 'missed_mate' || theme === 'missed_tactic' || theme === 'missed_fork' ? 'sly' : 'worried',
      marks, options: ctx.canTakeBack ? ['takeback', 'show', 'playon'] : ['show', 'playon'],
    };
  }

  memoryLine(theme, d) {
    if (this.themesThisGame[theme]) return this.line('iv_memory_game');
    const seen = lastSeen(this.memory, theme, this.gameNo);
    if (!seen) return null;
    const [themeText] = this.p.themes[theme] || [];
    if (seen.recent >= 3 && this.rng() < 0.7) return this.line('iv_memory_pattern', { count: seen.recent + 1, theme: themeText });
    if (seen.ago <= 5) {
      const l = seen.last || {};
      return this.line('iv_memory', { when: whenText(seen.ago, this.kids), theme: themeText, mpiece: l.piece ? NAME[l.piece] : null, msq: l.sq });
    }
    return null;
  }

  afterTakeback(ctx) {
    const parts = [this.line('takeback_done')];
    if (ctx.last && this.voice.has('takeback_last')) parts.push(this.line('takeback_last'));
    const marks = [];
    // kids: light up the piece in danger so they can find the fix themselves
    if (this.kids && ctx.danger) marks.push({ sq: ctx.danger, kind: 'danger' });
    return { text: parts.filter(Boolean).join(' '), mood: 'calm', marks };
  }

  playOn() { return { text: this.line('play_on'), mood: 'calm' }; }

  showMe(ctx) {
    // ctx: { why, replyUci, replySan, bestUci, bestSan }
    const t = ctx.why && ctx.why.theme;
    if (t === 'missed_mate' || t === 'missed_tactic' || t === 'missed_fork' || t === 'opening' || t === 'endgame' || t === 'positional')
      return { text: this.line('show_best', { best: ctx.bestSan }), arrows: ctx.bestUci ? [{ uci: ctx.bestUci, color: 'good' }] : [], mood: 'calm' };
    const key = t === 'mate_threat' ? 'show_mate' : 'show_reply';
    const d = ctx.why ? ctx.why.detail : {};
    return { text: this.line(key, { reply: ctx.replySan, piece: d.piece ? NAME[d.piece] : 'piece' }), arrows: ctx.replyUci ? [{ uci: ctx.replyUci, color: 'danger' }] : [], mood: 'worried' };
  }

  // ---------------------------------------------------------------- after the opponent's move
  /**
   * ctx: { facts (readOpponentMove), threat (findThreat) | null, before / after: player-POV cp,
   *        bestLine (player's best now), bestFacts, ply, color, fen }
   */
  afterOpponentMove(ctx) {
    if (this.silent) return null;
    this.quietMoves++;
    const { facts, threat } = ctx;
    const out = (key, level, extra = {}, more = {}) => {
      if (!this.wants(level) || this.cooling(key, ctx.ply, level)) return null;
      const text = this.line(key, extra);
      if (!text) return null;
      this.spoke();
      return { text, ...more };
    };

    // 1. Danger first: mate threats, then attacks on pieces
    if (threat && threat.mate) {
      const helpful = this.help >= 2 || this.talk === 'chatty';
      if (helpful) return out('warn_mate', 3, {}, { mood: 'worried', marks: this.kids ? [{ sq: threat.from, kind: 'attacker' }] : [] });
    }
    if (facts.check) return out('opp_checks', this.kids ? 2 : 1, {}, { mood: 'calm' });

    // 2. The opponent slipped: the player can win something big
    const jump = winChance(ctx.after) - winChance(ctx.before);
    if (jump >= 0.25 && ctx.after > 150 && ctx.bestFacts && (ctx.bestFacts.captured || ctx.bestFacts.fork || ctx.bestFacts.check || isMateScore(ctx.bestLine.cp))) {
      if (this.help >= 3) {
        const loose = loosePieces(pieceMap(new Chess(ctx.fen)), facts.color).filter(p => VALUE[p.type] >= 3)[0];
        if (loose) return out('opp_blunder_explicit', 3, { piece: NAME[loose.type], sq: loose.sq }, { mood: 'sly', marks: [{ sq: loose.sq, kind: 'target' }] });
      }
      if (this.help >= 2 || this.talk === 'chatty') return out('opp_blunder', 2, { piece: ctx.bestFacts.captured ? NAME[ctx.bestFacts.captured] : 'piece' }, { mood: 'sly' });
    }

    if (threat && threat.captured && VALUE[threat.captured] >= 3) {
      const data = { piece: NAME[threat.captured], sq: threat.sq, by: NAME[threat.piece] };
      if (this.help >= 3) return out('warn_threat', 2, data, { mood: 'worried', marks: [{ sq: threat.sq, kind: 'danger' }, { sq: threat.from, kind: 'attacker' }] });
      if (this.help === 2) return this.rng() < 0.5 ? out('warn_threat_vague', 2, data, { mood: 'thinking' }) : out('warn_threat', 2, data, { mood: 'worried' });
      if (this.talk === 'chatty') return out('warn_threat_vague', 1, data, { mood: 'thinking' });
    }

    // 3. Openings: one tip at a time, once per game
    const tip = this.openingTip(ctx);
    if (tip) { const r = out(tip, 1, {}, { mood: 'calm' }); if (r) { this.toldThisGame.add(tip); return r; } }

    // 4. The state of the game
    const status = ctx.after > 250 ? 1 : ctx.after < -250 ? -1 : 0;
    if (status !== this.lastStatus) {
      const was = this.lastStatus; this.lastStatus = status;
      if (status === 1 && was === -1) return out('status_turnaround', 2, {}, { mood: 'happy' });
      if (status === 1) return out('status_winning', 1, {}, { mood: 'happy' });
      if (status === -1) return out('status_losing', 1, {}, { mood: 'calm' });
    }
    if (ctx.phase === 'endgame' && !this.toldThisGame.has('endgame_start')) {
      this.toldThisGame.add('endgame_start');
      const r = out('endgame_start', 1, {}, { mood: 'calm' }); if (r) return r;
    }

    // 5. Commentary on what he did
    const extra = { piece: NAME[facts.piece], sq: facts.to, took: facts.captured ? NAME[facts.captured] : null };
    if (facts.captured) return out('opp_captures', 0, extra, { mood: 'calm' });
    if (facts.castle) return out('opp_castles', 0, extra, { mood: 'calm' });
    if (this.talk === 'chatty' && this.quietMoves >= 2 && this.rng() < 0.4) return out('filler', 0, {}, { mood: 'calm' });
    return out(ctx.ply < 16 && 'nbq'.includes(facts.piece) ? 'opp_develops' : 'opp_quiet', 0, extra, { mood: 'calm' });
  }

  openingTip(ctx) {
    if (ctx.ply > 24 || !ctx.dev) return null;
    const told = k => this.toldThisGame.has(k) || (this.memory.told[k] && this.gameNo - this.memory.told[k] < 3);
    const mark = k => { this.memory.told[k] = this.gameNo; return k; };
    const d = ctx.dev; // { developed, castled, queenOut, kingMoved, sameMoves, rimKnight, centerPawns, ply }
    if (d.rimKnight && !told('opening_edge_knight')) return mark('opening_edge_knight');
    if (d.queenOut && ctx.ply < 12 && !told('opening_queen_early')) return mark('opening_queen_early');
    if (d.sameMoves >= 3 && ctx.ply < 16 && !told('opening_same_piece')) return mark('opening_same_piece');
    if (ctx.ply >= 8 && d.developed < 2 && !told('opening_develop')) return mark('opening_develop');
    if (ctx.ply >= 6 && d.centerPawns === 0 && !told('opening_center')) return mark('opening_center');
    if (ctx.ply >= 14 && !d.castled && !d.kingMoved && !told('opening_castle')) return mark('opening_castle');
    return null;
  }

  // ---------------------------------------------------------------- asking the coach (offline)
  threatAnswer(threat) {
    if (!threat) return { text: this.line('threat_none'), mood: 'calm' };
    if (threat.mate) return { text: this.line('threat_mate_is', { move: threat.san }), arrows: [{ uci: threat.move, color: 'danger' }], mood: 'worried' };
    return { text: this.line('threat_is', { move: threat.san, piece: threat.captured ? NAME[threat.captured] : 'piece' }) || this.line('threat_none'), arrows: [{ uci: threat.move, color: 'danger' }], mood: 'worried' };
  }

  hint(fen, best) {
    // escalates each time the player asks in the same position
    if (this.hintFen !== fen) { this.hintFen = fen; this.hintLevel = 0; }
    this.hintLevel = Math.min(3, this.hintLevel + 1);
    if (!best) return { text: this.line('hint_none_needed'), mood: 'calm' };
    if (this.hintLevel === 1 && !this.kids) return { text: this.line('hint_1'), mood: 'thinking' };
    if (this.hintLevel <= 2) return { text: this.line('hint_2', { piece: NAME[best.piece], sq: best.from }), marks: [{ sq: best.from, kind: 'hint' }], mood: 'thinking' };
    return { text: this.line('hint_3', { best: best.san }), arrows: [{ uci: best.uci, color: 'good' }], mood: 'happy' };
  }

  plan({ cp, phase: ph, dev, material }) {
    let key = 'plan_equal';
    if (ph === 'opening' && dev && (dev.developed < 3 || !dev.castled)) key = 'plan_develop';
    else if (cp > 500 && material && material.oppPieces === 0) key = 'plan_mate';
    else if (cp > 250) key = 'plan_winning';
    else if (cp < -250) key = 'plan_losing';
    else if (ph === 'endgame') key = 'plan_endgame';
    return { text: this.line(key), mood: 'calm' };
  }

  explainOpp(facts) {
    if (!facts) return { text: this.line('threat_none'), mood: 'calm' };
    if (facts.captured) return { text: this.line('opp_captures', { took: NAME[facts.captured], sq: facts.to }), mood: 'calm' };
    if (facts.check) return { text: this.line('opp_checks'), mood: 'calm' };
    return { text: this.line('explain_opp_dev', { piece: NAME[facts.piece] }), mood: 'calm' };
  }

  clockLow() { return this.silent ? null : { text: this.line('clock_low'), mood: 'worried' }; }

  // ---------------------------------------------------------------- the end
  end({ result, reason, comeback }) {
    let key = result === 'win' ? (comeback ? 'end_win_comeback' : 'end_win') : result === 'loss' ? 'end_loss' : 'end_draw';
    if (reason === 'time') key = result === 'win' ? 'end_timeout_win' : 'end_timeout_loss';
    if (reason === 'resign') key = 'end_resign';
    return { text: this.line(key), mood: result === 'win' ? 'happy' : 'calm' };
  }
  cardIntro() { return this.line('card_intro'); }
  themeText(theme) { return (this.p.themes[theme] || [theme, ''])[0]; }
  themeTip(theme) { return (this.p.themes[theme] || ['', ''])[1]; }
}

function freeCapture(ctx) {
  // a capture he can't simply answer by taking back on the same square
  return ctx.facts.captured && !ctx.recapture;
}

/** Opening facts for one side, for tips. */
export function developmentFacts(chess, color) {
  const map = pieceMap(chess);
  const home = color === 'w' ? '1' : '8';
  let developed = 0, rimKnight = false, queenOut = false, castled = false, kingMoved = false, centerPawns = 0;
  const startMinor = color === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  for (const s of startMinor) { const p = map[s]; if (!p || p.color !== color || !'nb'.includes(p.type)) developed++; }
  for (const [sq, p] of Object.entries(map)) {
    if (p.color !== color) continue;
    if (p.type === 'n' && (sq[0] === 'a' || sq[0] === 'h')) rimKnight = true;
    if (p.type === 'q' && sq[1] !== home) queenOut = true;
    if (p.type === 'k') { if (['g1', 'c1', 'g8', 'c8', 'b1', 'b8', 'h1', 'h8'].includes(sq)) castled = true; else if (sq !== 'e' + home) kingMoved = true; }
    if (p.type === 'p' && 'de'.includes(sq[0]) && '3456'.includes(sq[1])) centerPawns++;
  }
  // how many times the most-moved piece has moved
  const hist = chess.history({ verbose: true }).filter(m => m.color === color);
  const moves = {};
  let sameMoves = 0;
  const track = {};
  for (const m of hist) { const id = track[m.from] || m.from; delete track[m.from]; track[m.to] = id; moves[id] = (moves[id] || 0) + 1; sameMoves = Math.max(sameMoves, moves[id]); }
  return { developed, rimKnight, queenOut, castled, kingMoved, centerPawns, sameMoves };
}
