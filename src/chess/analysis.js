// Turns raw engine numbers into chess meaning: how good was a move, why was it bad,
// what is the opponent threatening. Everything the coach says is grounded in these facts.
import { Chess } from 'chess.js';
import { VALUE, NAME, pieceMap, loosePieces, targetsOf, pinsAgainst, nullMoveFen, phase, uciToMove, sanOf, other, material, attackersOf } from './core.js';
import { isMateScore, mateIn } from './engine.js';

/** Winning chances for White, -1..1 (Lichess' curve). */
export const winChance = cp => {
  if (isMateScore(cp)) return cp > 0 ? 1 : -1;
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
};
/** Score from the point of view of `color`. */
export const pov = (cp, color) => (color === 'w' ? cp : -cp);

/**
 * Classify a move given the evaluation before (best line) and after it was played.
 * Returns { loss (win-chance points 0..2), cpLoss, kind: 'best'|'good'|'inaccuracy'|'mistake'|'blunder' }.
 */
export function judge(bestCp, afterCp, mover) {
  const before = winChance(pov(bestCp, mover));
  const after = winChance(pov(afterCp, mover));
  const loss = Math.max(0, before - after);
  const cpLoss = Math.max(0, Math.min(2000, pov(bestCp, mover)) - Math.min(2000, pov(afterCp, mover)));
  let kind = 'good';
  if (loss >= 0.3) kind = 'blunder';
  else if (loss >= 0.2) kind = 'mistake';
  else if (loss >= 0.1) kind = 'inaccuracy';
  else if (loss < 0.02) kind = 'best';
  // A missed forced mate is always serious
  if (isMateScore(bestCp) && pov(bestCp, mover) > 0 && !(isMateScore(afterCp) && pov(afterCp, mover) > 0)) {
    if (kind === 'best' || kind === 'good' || kind === 'inaccuracy') kind = pov(afterCp, mover) > 300 ? 'inaccuracy' : 'mistake';
  }
  return { loss, cpLoss, kind };
}

/** Describe a move in plain facts: what moved, what it captured, checks, threats it creates. */
export function describeMove(fen, uci) {
  const c = new Chess(fen);
  const before = pieceMap(c);
  let m;
  try { m = c.move(uciToMove(uci)); } catch (e) { return null; }
  if (!m) return null;
  const after = pieceMap(c);
  const facts = {
    san: m.san, uci, color: m.color, piece: m.piece, from: m.from, to: m.to,
    captured: m.captured || null, promotion: m.promotion || null,
    check: c.inCheck(), mate: c.isCheckmate(),
    castle: m.flags.includes('k') ? 'king' : m.flags.includes('q') ? 'queen' : null,
    targets: targetsOf(after, m.to),
    fork: false, fenAfter: c.fen(),
  };
  facts.fork = facts.targets.filter(t => t.type === 'k' || VALUE[t.type] >= 3).length >= 2;
  // pins newly created against the opponent
  const pinsBefore = pinsAgainst(before, other(m.color)).map(p => p.pinned).join();
  facts.newPins = pinsAgainst(after, other(m.color)).filter(p => !pinsBefore.includes(p.pinned));
  // discovered attack: a different piece of ours now hits something big
  facts.discovered = false;
  for (const [sq, pc] of Object.entries(after)) {
    if (pc.color !== m.color || sq === m.to || !'brq'.includes(pc.type)) continue;
    const now = targetsOf(after, sq).filter(t => t.type === 'k' || VALUE[t.type] > VALUE[pc.type]);
    const was = before[sq] ? targetsOf(before, sq).map(t => t.sq) : [];
    if (now.some(t => !was.includes(t.sq))) { facts.discovered = true; break; }
  }
  return facts;
}

/**
 * Why was the player's move a mistake? Uses the opponent's best reply and the best move they missed.
 * Returns { theme, detail } where theme is one of:
 * hang, mate_threat, missed_mate, missed_tactic, missed_fork, ignored_threat, bad_trade, king_safety, opening, endgame, positional
 */
export function explainMistake({ fenBefore, played, bestLine, afterLine, priorThreat }) {
  const mover = fenBefore.split(' ')[1];
  const playedFacts = describeMove(fenBefore, played);
  const fenAfter = playedFacts ? playedFacts.fenAfter : null;
  const detail = { played: playedFacts && playedFacts.san };
  const map0 = pieceMap(new Chess(fenBefore));

  // 1. Missed a forced mate
  if (bestLine && isMateScore(bestLine.cp) && pov(bestLine.cp, mover) > 0 && mateIn(pov(bestLine.cp, mover)) <= 3) {
    return { theme: 'missed_mate', detail: { ...detail, best: sanOf(fenBefore, bestLine.move), mateIn: mateIn(pov(bestLine.cp, mover)) } };
  }
  // 2. Now the opponent has mate
  if (afterLine && isMateScore(afterLine.cp) && pov(afterLine.cp, mover) < 0 && !(bestLine && isMateScore(bestLine.cp) && pov(bestLine.cp, mover) < 0)) {
    return { theme: 'mate_threat', detail: { ...detail, reply: sanOf(fenAfter, afterLine.move), mateIn: Math.abs(mateIn(afterLine.cp)) } };
  }
  // 3. The opponent's best reply wins material: which piece was left hanging?
  if (afterLine && fenAfter) {
    const reply = describeMove(fenAfter, afterLine.move);
    if (reply && reply.captured) {
      const victimSq = reply.to;
      const victim = { type: reply.captured, sq: victimSq };
      if (playedFacts.captured && VALUE[playedFacts.captured] < VALUE[playedFacts.piece] && victimSq === playedFacts.to) {
        return { theme: 'bad_trade', detail: { ...detail, piece: playedFacts.piece, sq: victimSq, took: playedFacts.captured, by: reply.piece } };
      }
      // was this piece already attacked before our move (ignored threat) or did our move abandon it?
      const wasAttacked = victimSq !== playedFacts.to && attackersOf(map0, victimSq, other(mover)).length > 0;
      if (priorThreat && priorThreat.sq === victimSq) return { theme: 'ignored_threat', detail: { ...detail, piece: victim.type, sq: victimSq, by: reply.piece, reply: reply.san } };
      return { theme: wasAttacked ? 'ignored_threat' : 'hang', detail: { ...detail, piece: victim.type, sq: victimSq, by: reply.piece, bySq: reply.from, reply: reply.san, moved: victimSq === playedFacts.to } };
    }
    if (reply && (reply.fork || reply.check && reply.targets.length >= 2)) {
      return { theme: 'hang', detail: { ...detail, fork: true, by: reply.piece, reply: reply.san, targets: reply.targets.map(t => t.type) } };
    }
    if (reply && reply.newPins && reply.newPins.length) {
      return { theme: 'hang', detail: { ...detail, pin: true, by: reply.piece, reply: reply.san } };
    }
  }
  // 4. We missed a tactic of our own
  if (bestLine) {
    const best = describeMove(fenBefore, bestLine.move);
    if (best && (best.fork)) return { theme: 'missed_fork', detail: { ...detail, best: best.san, piece: best.piece, targets: best.targets.map(t => t.type) } };
    if (best && (best.captured || best.check || best.newPins.length || best.discovered)) {
      return { theme: 'missed_tactic', detail: { ...detail, best: best.san, captured: best.captured, check: best.check, pin: best.newPins.length > 0 } };
    }
  }
  // 5. Broader themes by phase
  const ph = phase(map0);
  if (ph === 'opening') return { theme: 'opening', detail: { ...detail, best: bestLine && sanOf(fenBefore, bestLine.move) } };
  if (ph === 'endgame') return { theme: 'endgame', detail: { ...detail, best: bestLine && sanOf(fenBefore, bestLine.move) } };
  // king safety: pawn shield moved / king in the open
  if (playedFacts && playedFacts.piece === 'p' && kingShieldMoved(map0, playedFacts)) return { theme: 'king_safety', detail };
  return { theme: 'positional', detail: { ...detail, best: bestLine && sanOf(fenBefore, bestLine.move) } };
}

function kingShieldMoved(map, mv) {
  const kingSq = Object.keys(map).find(s => map[s].type === 'k' && map[s].color === mv.color);
  if (!kingSq) return false;
  return Math.abs(kingSq.charCodeAt(0) - mv.from.charCodeAt(0)) <= 1;
}

/**
 * What is the side that just moved threatening? Uses a null move: "if you passed, what would they do?"
 * Needs an engine (async). Returns { move, san, gain, captured, mate, sq } or null.
 */
export async function findThreat(engine, fen, currentCp, depth = 9) {
  const nf = nullMoveFen(fen);
  if (!nf) return null;
  const res = await engine.analyze(nf, { depth, multipv: 1 });
  const line = res.lines[0];
  if (!line) return null;
  const attacker = nf.split(' ')[1];
  const gain = pov(line.cp, attacker) - pov(currentCp, attacker);
  const facts = describeMove(nf, line.move);
  if (!facts) return null;
  const mate = isMateScore(line.cp) && pov(line.cp, attacker) > 0 ? mateIn(pov(line.cp, attacker)) : 0;
  if (!mate && gain < 150) return null;
  return { move: line.move, san: facts.san, gain, captured: facts.captured, mate, sq: facts.to, piece: facts.piece, from: facts.from, check: facts.check, fork: facts.fork };
}

/** Plain-language facts about the opponent's move for the coach to read out. */
export function readOpponentMove(fenBefore, uci) {
  const f = describeMove(fenBefore, uci);
  if (!f) return null;
  const mapAfter = pieceMap(new Chess(f.fenAfter));
  const us = other(f.color);
  const loose = loosePieces(mapAfter, us);
  return { ...f, ourLoose: loose, ourPinned: pinsAgainst(mapAfter, us), material: material(mapAfter), phase: phase(mapAfter) };
}

export { NAME, VALUE };
