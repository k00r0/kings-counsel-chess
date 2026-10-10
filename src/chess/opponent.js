// The adaptive opponent. Stockfish finds the truth; this file decides which move a human
// of a given strength would actually play: usually a decent move, sometimes a slip.
import { Chess } from 'chess.js';
import { VALUE } from './core.js';
import { pov } from './analysis.js';
import { isMateScore } from './engine.js';

/** Settings for a target rating (roughly chess.com rapid scale). */
export function profile(elo) {
  const e = Math.max(100, Math.min(2400, elo));
  const t = (e - 100) / 2300; // 0..1
  return {
    elo: e,
    depth: Math.round(4 + t * 12),            // how far it looks
    multipv: e < 1800 ? 6 : 4,                 // how many candidate moves it weighs
    temperature: Math.round(320 * Math.pow(1 - t, 2.2) + 12), // centipawns of "noise" in its judgment
    slip: Math.max(0.006, 0.2 * Math.pow(1 - t, 2.4)),         // chance of an outright oversight
    missMate: Math.max(0, 0.6 * Math.pow(1 - t, 3)),           // chance to not see a mate in 1-2
    greed: 60 * (1 - t),                       // low-rated players love captures
    thinkMs: [700 + t * 900, 2200 + t * 3500], // how long it "thinks" (min..max)
  };
}

function rnd(rng, a, b) { return a + (b - a) * rng(); }

/**
 * Pick a move.
 * lines: engine MultiPV lines for the position (opponent to move), cp from White's view.
 * ease: 0..1, raised by the coach system when the player is in deep trouble in a coached game,
 *       so the game stays winnable without the opponent playing absurd moves.
 */
export function chooseMove(fen, lines, elo, { rng = Math.random, ease = 0 } = {}) {
  const c = new Chess(fen);
  const me = c.turn();
  const legal = c.moves({ verbose: true });
  if (!legal.length) return null;
  const p = profile(elo - ease * 350);
  if (!lines.length) return legal[Math.floor(rng() * legal.length)].lan;

  const best = pov(lines[0].cp, me);

  // A mate on the board: strong players never miss it; weak ones sometimes do
  if (isMateScore(lines[0].cp) && best > 0 && rng() > p.missMate) return lines[0].move;

  // Occasional oversight: a natural-looking move that isn't among the engine's choices
  if (rng() < p.slip + ease * 0.12) {
    const natural = legal.filter(m => !lines.some(l => l.move === m.lan) && looksNatural(m, c));
    const safe = natural.filter(m => !losesQueenOrMate(m, lines));
    const pool = safe.length ? safe : natural;
    if (pool.length) return pool[Math.floor(rng() * pool.length)].lan;
  }

  // Otherwise: weigh the candidates, preferring better moves, with human noise and greed
  const scored = lines.map(l => {
    let v = Math.max(-1500, Math.min(1500, pov(l.cp, me)));
    const m = legal.find(x => x.lan === l.move);
    if (m && m.captured) v += p.greed * (VALUE[m.captured] / 3);
    if (m && m.san.includes('+')) v += p.greed * 0.4;
    return { move: l.move, v };
  });
  const top = Math.max(...scored.map(s => s.v));
  const weights = scored.map(s => Math.exp((s.v - top) / p.temperature));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < scored.length; i++) { r -= weights[i]; if (r <= 0) return scored[i].move; }
  return scored[0].move;
}

function looksNatural(m, c) {
  // captures, checks, developing moves and central pawn pushes are what people actually play
  if (m.captured || m.san.includes('+')) return true;
  if ('nb'.includes(m.piece) && (m.from[1] === '1' || m.from[1] === '8')) return true;
  if (m.piece === 'p' && 'cdef'.includes(m.to[0])) return true;
  if (m.piece === 'q' || m.piece === 'r') return Math.random() < 0.5;
  return Math.random() < 0.3;
}

function losesQueenOrMate(m, lines) {
  // never "slip" by hanging the queen outright or walking into mate in 1: those feel fake
  return m.piece === 'q' && !m.captured;
}

/** How long the opponent appears to think (ms). Longer in sharp positions. */
export function thinkTime(elo, lines, rng = Math.random) {
  const p = profile(elo);
  let ms = rnd(rng, p.thinkMs[0], p.thinkMs[1]);
  if (lines.length > 1 && Math.abs(lines[0].cp - lines[1].cp) < 30) ms *= 1.3;
  return Math.round(ms);
}

/** Opponent rating to use against a player: slightly below their level in coached games. */
export function matchElo(playerElo, mode) {
  return Math.round(mode === 'test' ? playerElo : playerElo - 120);
}
