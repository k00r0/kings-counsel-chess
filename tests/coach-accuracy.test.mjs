// Is the coach right when it says "that was a mistake, X was better"?
// Plays simulated coached games, collects every intervention and inaccuracy note, then checks each one
// against a much deeper reference analysis (depth 22).  Usage: node tests/coach-accuracy.test.mjs <games> <verify:0|1>
import { nodeEngine } from './node-engine.mjs';
import { GameController } from '../src/game/controller.js';
import { Coach } from '../src/coach/coach.js';
import { freshMemory } from '../src/coach/memory.js';
import { chooseMove } from '../src/chess/opponent.js';
import { judge, pov } from '../src/chess/analysis.js';
import { Chess } from 'chess.js';
const eng = await nodeEngine();
const games = +(process.argv[2] || 3), verify = process.argv[3] !== '0';
let seed = 21; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const calls = [];
for (let g = 1; g <= games; g++) {
  const mem = freshMemory();
  const coach = new Coach({ persona: 'vizier', talk: 'normal', help: 2, mode: 'coached', memory: mem, gameNo: g, name: 'Sam', opp: 'X', rng });
  const ctl = new GameController({ engine: eng, coach, playerColor: g % 2 ? 'w' : 'b', mode: 'coached', tc: null, oppElo: 900, takebacks: 0, depth: 12, rng, verify });
  await ctl.start(null);
  let guard = 0;
  while (ctl.state.status === 'playing' && guard++ < 40000 && ctl.chess.history().length < 120) {
    await new Promise(r => setTimeout(r, 15));
    if (ctl.state.awaiting) { ctl.choose('playon'); continue; }
    if (ctl.isPlayersTurn() && !ctl.state.busy && !ctl.state.thinking) {
      const pre = await ctl.pre;
      const mv = chooseMove(pre.fen, pre.lines, 650, { rng });
      if (ctl.chess.fen() !== pre.fen) continue;
      await ctl.playerMove({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || 'q' });
    }
  }
  for (const r of ctl.records) if (r.kind !== 'best' && r.kind !== 'good' && r.best) calls.push(r);
  ctl.destroy();
  console.log(`game ${g}: ${ctl.chess.history().length} plies, ${ctl.records.filter(r => r.kind === 'mistake' || r.kind === 'blunder').length} mistakes flagged`);
}
let falseAlarm = 0, badAdvice = 0, n = 0;
for (const r of calls) {
  const me = r.fenBefore.split(' ')[1];
  const ref = await eng.analyze(r.fenBefore, { depth: 22 });
  const c1 = new Chess(r.fenBefore); c1.move({ from: r.uci.slice(0, 2), to: r.uci.slice(2, 4), promotion: r.uci[4] || 'q' });
  const afterPlayed = c1.isGameOver() ? null : await eng.analyze(c1.fen(), { depth: 21 });
  const c2 = new Chess(r.fenBefore); c2.move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] || 'q' });
  const afterBest = c2.isCheckmate() ? { lines: [{ cp: me === 'w' ? 99900 : -99900 }] } : c2.isGameOver() ? null : await eng.analyze(c2.fen(), { depth: 21 });
  if (!afterPlayed || !afterBest || !ref.lines[0]) continue;
  n++;
  const realLoss = judge(ref.lines[0].cp, afterPlayed.lines[0].cp, me);
  const flagged = r.kind === 'mistake' || r.kind === 'blunder';
  const fa = flagged && (realLoss.kind === 'best' || realLoss.kind === 'good');
  const recWorse = pov(afterBest.lines[0].cp, me) < pov(afterPlayed.lines[0].cp, me) + 30 || pov(afterBest.lines[0].cp, me) < pov(ref.lines[0].cp, me) - 120;
  if (fa) falseAlarm++;
  if (recWorse) badAdvice++;
  if (fa || recWorse) console.log(`  ✗ ${r.kind} on ${r.san} (rec ${r.bestSan}) real=${realLoss.kind} played=${pov(afterPlayed.lines[0].cp, me)} rec=${pov(afterBest.lines[0].cp, me)} best=${pov(ref.lines[0].cp, me)}`);
}
console.log(`\nVERIFY=${verify}: ${n} coach calls checked. False alarms: ${falseAlarm}. Wrong or no-better recommendation: ${badAdvice}.`);
process.exit(0);
