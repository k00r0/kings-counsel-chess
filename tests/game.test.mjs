// Plays full coached games headlessly: a simulated ~700 player vs the adaptive opponent,
// printing everything the coach says. Checks interventions, take-backs and the summary.
import { nodeEngine } from './node-engine.mjs';
import { GameController } from '../src/game/controller.js';
import { Coach } from '../src/coach/coach.js';
import { freshMemory, recordMistake, addGame, openingReminder } from '../src/coach/memory.js';
import { chooseMove, profile } from '../src/chess/opponent.js';
import assert from 'assert';
import { gameCard, advisorReport } from '../src/coach/report.js';
const eng = await nodeEngine();
const persona = process.argv[2] || 'vizier';
const games = +(process.argv[3] || 2);
const mem = freshMemory();
let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const said = [];
for (let g = 1; g <= games; g++) {
  const coach = new Coach({ persona, talk: 'normal', help: persona === 'hopper' ? 3 : 2, mode: 'coached', memory: mem, gameNo: g, name: 'Sam', opp: 'Brother Anselm', rng });
  const ctl = new GameController({ engine: eng, coach, playerColor: g % 2 ? 'w' : 'b', mode: 'coached', tc: null, oppElo: 700, kids: persona === 'hopper', takebacks: 3, depth: 10, rng });
  let lastText = null, interventions = 0, tbs = 0;
  ctl.subscribe(s => { if (s.coach && s.coach.text !== lastText) { lastText = s.coach.text; said.push(s.coach.text); console.log(`  [${s.history.length}] ${persona}: ${s.coach.text}${s.coach.options ? '  <' + s.coach.options.join('|') + '>' : ''}`); } });
  const rem = openingReminder(mem, g);
  await ctl.start(coach.start({ firstGame: g === 1, lastResult: mem.games.length ? mem.games[mem.games.length - 1].result : null, reminder: rem }));
  let guard = 0;
  while (ctl.state.status === 'playing' && guard++ < 40000) {
    await new Promise(r => setTimeout(r, 20));
    if (ctl.state.awaiting) {
      interventions++;
      const opt = ctl.state.coach.options.includes('takeback') && rng() < 0.7 ? 'takeback' : 'playon';
      if (opt === 'takeback') tbs++;
      if (rng() < 0.3) ctl.choose('show');
      ctl.choose(opt); continue;
    }
    if (ctl.isPlayersTurn() && !ctl.state.busy && !ctl.state.thinking && ctl.chess.history().length < 160) {
      const pre = await ctl.pre;
      const mv = chooseMove(pre.fen, pre.lines, 600, { rng });
      if (ctl.chess.fen() !== pre.fen) continue;
      await ctl.playerMove({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] || 'q' });
    }
    if (ctl.chess.history().length >= 160) { ctl.resign(); }
  }
  const sum = ctl.summary();
  console.log(`GAME ${g}: ${sum.result} by ${sum.reason} in ${sum.plies} plies, acc ${sum.accuracy}%, interventions ${interventions}, takebacks ${tbs}, mistakes:`, sum.mistakes.map(m => m.theme + (m.takenBack ? '*' : '')).join(' '));
  for (const m of sum.mistakes) recordMistake(mem, g, m.theme, { piece: m.piece, sq: m.sq, san: m.played });
  addGame(mem, { n: g, ...sum });
  const card = gameCard(sum, coach, mem);
  console.log('CARD:', card.intro, card.items.map(i => `[${i.title}] ${i.text} ${i.tip || ''}`).join(' | '));
  if (g === games) { const rep = advisorReport({ games: mem.games, prev: null, coach, rating: 820, ratingBefore: 800, name: 'Sam', number: 1 }); console.log('REPORT:', JSON.stringify({ h: rep.headline, v: rep.verdict, spots: rep.spots, style: rep.style, focus: rep.focus.map(f => [f.title, f.habit, f.drills.length]) }, null, 1)); }
  assert(sum.plies > 0);
  ctl.destroy();
}
const dup = said.filter((s, i) => said.indexOf(s) !== i);
console.log('lines:', said.length, 'exact repeats:', dup.length, dup.slice(0, 5));
process.exit(0);
