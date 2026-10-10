import { nodeEngine } from './node-engine.mjs';
import { judge, explainMistake, findThreat, describeMove } from '../src/chess/analysis.js';
import assert from 'assert';
const eng = await nodeEngine();
async function check(fen, played) {
  const before = await eng.analyze(fen, { depth: 12, multipv: 1 });
  const d = describeMove(fen, played);
  const after = await eng.analyze(d.fenAfter, { depth: 12 });
  const j = judge(before.lines[0].cp, after.lines[0].cp, fen.split(' ')[1]);
  const ex = explainMistake({ fenBefore: fen, played, bestLine: before.lines[0], afterLine: after.lines[0] });
  return { j, ex };
}
// 1. Hanging the queen: 1.e4 e5 2.Qh5 Nc6 3.Qxf7?? no.. use: after 1.e4 e5 2.Qg4?? d5? simpler: white plays Qg4 where d7 pawn bishop c8 takes
let r = await check('r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3', 'h5g5');
console.log('Qg5', r.j.kind, r.ex.theme, r.ex.detail);
assert(r.j.kind === 'blunder' && r.ex.theme === 'hang' && r.ex.detail.piece === 'q');
// 2. Missed mate in 1 (scholar's): white Qh5, Bc4 vs ...Nf6?? -> white plays something else
r = await check('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'd2d3');
console.log('miss mate', r.j.kind, r.ex.theme, r.ex.detail);
assert(r.ex.theme === 'missed_mate');
// 3. Allowing mate: black plays ...Nf6?? in scholar's position
r = await check('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', 'g8f6');
console.log('allow mate', r.j.kind, r.ex.theme, r.ex.detail);
assert(r.ex.theme === 'mate_threat');
// 4. Threat detection: white Qh5+Bc4 threatens Qxf7#
const t = await findThreat(eng, 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', 0);
console.log('threat', t);
assert(t && t.mate === 1 && t.san === 'Qxf7#');
// 5. Missed fork: Nc7+ fork
r = await check('r3k3/8/8/3N4/8/8/8/4K2q w - - 0 1', 'e1e2');
console.log('fork', r.j.kind, r.ex.theme, r.ex.detail);
r = await check('r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3', 'h5e5');
console.log('Qxe5', r.j.kind, r.ex.theme, r.ex.detail); assert(r.ex.theme==='bad_trade');
console.log('ALL OK'); process.exit(0);
