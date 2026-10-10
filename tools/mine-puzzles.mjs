// Mines puzzles from games the adaptive opponent plays against itself (no third-party data, so no licences to worry about).
// A position becomes a puzzle when exactly one move wins (or saves) the game, verified at high depth.
// Usage: node tools/mine-puzzles.mjs <games> <out.json>
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { nodeEngine } from '../tests/node-engine.mjs';
import { chooseMove, profile } from '../src/chess/opponent.js';
import { describeMove, pov } from '../src/chess/analysis.js';
import { isMateScore, mateIn } from '../src/chess/engine.js';
import { pieceMap, attackersOf, VALUE, uciToMove, pvToSan } from '../src/chess/core.js';

const N = +(process.argv[2] || 20), OUT = process.argv[3] || 'content/mined.json';
const eng = await nodeEngine();
let seed = Date.now() % 100000 + 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const found = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
const seen = new Set(found.map(p => p.fen.split(' ').slice(0, 4).join(' ')));

function classify(fen, line, second, me) {
  const f = describeMove(fen, line.move);
  const best = pov(line.cp, me);
  if (isMateScore(line.cp) && best > 0) { const m = mateIn(best); if (m <= 3) return { theme: 'mate' + m, f }; }
  const map = pieceMap(new Chess(fen));
  // capture of a piece that had no defenders
  if (f.captured && VALUE[f.captured] >= 3 && !attackersOf(map, f.to, me === 'w' ? 'b' : 'w').length) return { theme: 'hanging', f };
  if (f.fork) return { theme: 'fork', f };
  if (f.newPins.length) return { theme: 'pin', f };
  if (f.discovered) return { theme: 'discovered', f };
  if (!f.captured && !f.check) return { theme: 'quiet', f };
  return { theme: 'combination', f };
}

const RATING = { hanging: 500, mate1: 650, fork: 850, pin: 950, discovered: 1050, mate2: 1150, combination: 1150, quiet: 1350, mate3: 1450, defence: 1250 };

for (let g = 0; g < N; g++) {
  const c = new Chess();
  const eloW = 500 + Math.floor(rng() * 1000), eloB = 500 + Math.floor(rng() * 1000);
  let prevPov = 0;
  while (!c.isGameOver() && c.history().length < 140) {
    const fen = c.fen(), me = c.turn();
    const elo = me === 'w' ? eloW : eloB;
    const a = await eng.analyze(fen, { depth: 10, multipv: 2 });
    const [l1, l2] = a.lines;
    const ply = c.history().length;
    // candidate: unique winning move, position wasn't already won; or unique saving move
    if (l1 && l2 && ply >= 8) {
      const b1 = pov(l1.cp, me), b2 = pov(l2.cp, me);
      const key = fen.split(' ').slice(0, 4).join(' ');
      const mateOnly = process.env.MATES === '1';
      const isMate1 = isMateScore(l1.cp) && b1 > 0 && mateIn(b1) <= 3, isMate2 = isMateScore(l2.cp) && b2 > 0 && mateIn(b2) <= mateIn(b1);
      const mating = isMate1 && !isMate2;
      const winning = mateOnly ? mating : mating || b1 >= 250 && b1 - b2 >= 200 && prevPov < 150 && b2 < 250;
      const lastTo = c.history({ verbose: true }).slice(-1)[0]?.to;
      const saving = !mateOnly && b1 > -80 && b2 < -300 && b1 < 200 && l1.move.slice(2, 4) !== lastTo && rng() < 0.35;
      if ((winning || saving) && !seen.has(key)) {
        const v = await eng.analyze(fen, { depth: 16, multipv: 2 });
        const [v1, v2] = v.lines;
        if (v1 && v2 && v1.move === l1.move) {
          const c1 = pov(v1.cp, me), c2 = pov(v2.cp, me);
          const vm1 = isMateScore(v1.cp) && c1 > 0 && mateIn(c1) <= 3, vm2 = isMateScore(v2.cp) && c2 > 0 && mateIn(c2) <= mateIn(c1);
          const okWin = winning && vm1 && !vm2 || !mateOnly && winning && c1 >= 250 && c1 - c2 >= 200 && c2 < 250;
          const okSave = saving && c1 > -80 && c2 < -300;
          if (okWin || okSave) {
            let { theme, f } = classify(fen, v1, v2, me);
            if (okSave && !okWin) theme = 'defence';
            // full solution line for mates; otherwise the first move (plus the expected reply for show)
            const n = theme.startsWith('mate') ? +theme[4] * 2 - 1 : 1;
            const sol = v1.pv.slice(0, n);
            let rating = RATING[theme] + Math.round((rng() - 0.5) * 200);
            if (theme !== 'quiet' && !f.captured && !f.check) rating += 150;
            seen.add(key);
            found.push({ fen, lastTo, theme, solution: sol, san: pvToSan(fen, sol, n), rating, eval: c1, side: me, from: 'selfplay' });
            fs.writeFileSync(OUT, JSON.stringify(found));
          }
        }
      }
      prevPov = -b1; // from the next mover's point of view, roughly
    }
    const mv = chooseMove(fen, a.lines.length ? a.lines : [], elo, { rng });
    c.move(uciToMove(mv));
  }
  const byTheme = {}; for (const p of found) byTheme[p.theme] = (byTheme[p.theme] || 0) + 1;
  console.log(`game ${g + 1}/${N}: ${found.length} puzzles`, JSON.stringify(byTheme));
}
process.exit(0);
