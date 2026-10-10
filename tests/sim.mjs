// Plays the adaptive opponent against itself at different ratings to check it's ordered sensibly.
import { Chess } from 'chess.js';
import { nodeEngine } from './node-engine.mjs';
import { chooseMove, profile } from '../src/chess/opponent.js';
const eng = await nodeEngine();
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
async function game(eloW, eloB) {
  const c = new Chess();
  while (!c.isGameOver() && c.history().length < 160) {
    const elo = c.turn() === 'w' ? eloW : eloB;
    const p = profile(elo);
    const res = await eng.analyze(c.fen(), { depth: p.depth, multipv: p.multipv });
    const mv = chooseMove(c.fen(), res.lines, elo, { rng });
    c.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || 'q' });
  }
  if (c.isCheckmate()) return c.turn() === 'w' ? 0 : 1;
  if (c.isGameOver()) return 0.5;
  // adjudicate by engine
  const r = await eng.analyze(c.fen(), { depth: 12 });
  const cp = r.lines[0] ? r.lines[0].cp : 0;
  return cp > 300 ? 1 : cp < -300 ? 0 : 0.5;
}
const pairs = process.argv.slice(2).map(s => s.split(':').map(Number));
for (const [a, b] of pairs) {
  let score = 0; const n = 6;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) score += i % 2 ? 1 - await game(b, a) : await game(a, b);
  console.log(`${a} vs ${b}: ${a} scored ${score}/${n}  (${((Date.now() - t0) / n / 1000).toFixed(1)}s/game)`);
}
process.exit(0);
