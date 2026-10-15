// How often does the opponent take a free piece / play the winning move after the player blunders?
import fs from 'node:fs';
import { nodeEngine } from './node-engine.mjs';
import { chooseMove } from '../src/chess/opponent.js';
import { pov } from '../src/chess/analysis.js';
const eng = await nodeEngine();
const puz = JSON.parse(fs.readFileSync('content/puzzles.json', 'utf8')).filter(p => ['hanging', 'fork', 'combination', 'mate1'].includes(p.theme));
let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sample = []; for (let i = 0; i < 40; i++) sample.push(puz[Math.floor(rng() * puz.length)]);
const cases = [[400, 0.3], [700, 0], [700, 1], [1000, 0], [1000, 0.4], [1500, 0]];
const res = Object.fromEntries(cases.map(c => [c.join('/'), [0, 0]]));
for (const p of sample) {
  const me = p.fen.split(' ')[1];
  const a = await eng.analyze(p.fen, { depth: 12, multipv: 6 });
  const best = pov(a.lines[0].cp, me);
  for (const [elo, ease] of cases) {
    for (let k = 0; k < 25; k++) {
      const mv = chooseMove(p.fen, a.lines, elo, { rng, ease });
      const l = a.lines.find(x => x.move === mv);
      const ok = l && pov(l.cp, me) >= Math.min(best - 150, best * 0.6);
      const r = res[elo + '/' + ease]; r[1]++; if (ok) r[0]++;
    }
  }
}
for (const [k, [ok, n]] of Object.entries(res)) console.log(`elo/ease ${k}: punished ${Math.round(100 * ok / n)}%`);
process.exit(0);
