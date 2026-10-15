import { checkAnswer } from '../src/coach/factcheck.js';
import assert from 'assert';
const facts = { fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', best: ['g6', 'Qf3', 'Nf6'], threat: { move: 'Qxf7#' }, moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], lastOpp: 'Qh5' };
const cases = [
  ['He threatens Qxf7#. Block it with g6.', true],
  ['Play Nxe5 and grab the pawn.', false],           // not backed by the engine
  ['Develop with Bc5.', false],
  ['Castle with O-O right away.', false],
  ['Your pawn on e5 is fine. Watch the f7 square.', true],
];
for (const [t, want] of cases) { const r = checkAnswer(t, facts); console.log(r.ok === want ? '✓' : '✗', t, r.bad); assert.equal(r.ok, want); }
console.log('factcheck ok');
