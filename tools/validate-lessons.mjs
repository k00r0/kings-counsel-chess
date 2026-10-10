// Checks every lesson position with Stockfish, fills in engine replies ('*') and puzzle-bank steps,
// then writes content/lessons.json and content/puzzles.json for the build.
// Usage: node tools/validate-lessons.mjs
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { nodeEngine } from '../tests/node-engine.mjs';
import { PATHS } from '../src/lessons/paths.js';
import { pov } from '../src/chess/analysis.js';
import { isMateScore, mateIn } from '../src/chess/engine.js';
import { uciToMove, attacksFrom, pvToSan } from '../src/chess/core.js';

const eng = await nodeEngine();
const problems = [];
const bad = (where, msg) => { problems.push(`${where}: ${msg}`); console.log('✖', where, msg); };

// ---- puzzle bank ----
const load = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);
const raw = [...load('content/mined.json'), ...load('content/mined-mates.json')];
const seen = new Set();
const puzzles = [];
for (const p of raw) {
  const key = p.fen.split(' ').slice(0, 4).join(' ');
  if (seen.has(key)) continue;
  seen.add(key);
  // tidy: mate puzzles keep the whole line; others just the winning move
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  puzzles.push({ id: 'p' + h.toString(36), fen: p.fen, theme: p.theme, solution: p.solution, san: p.san, rating: p.rating });
}
puzzles.sort((a, b) => a.rating - b.rating);
console.log(`puzzle bank: ${puzzles.length}`, Object.entries(puzzles.reduce((a, p) => (a[p.theme] = (a[p.theme] || 0) + 1, a), {})).map(e => e.join(':')).join(' '));
const usedInLessons = new Set();

function minStarsMoves(step) {
  // breadth-first search over (square, stars left) to find the fewest moves
  const rocks = new Set(step.rocks || []);
  const all = step.stars;
  const start = { sq: step.start, mask: 0 };
  const full = (1 << all.length) - 1;
  const q = [[start.sq, 0, 0]];
  const vis = new Set([start.sq + ':0']);
  while (q.length) {
    const [sq, mask, d] = q.shift();
    if (mask === full) return d;
    const map = { [sq]: { type: step.piece[1], color: 'w' } };
    for (const r of rocks) map[r] = { type: 'p', color: 'w' };
    for (const t of attacksFrom(map, sq)) {
      if (rocks.has(t)) continue;
      const i = all.indexOf(t);
      const m = i >= 0 ? mask | (1 << i) : mask;
      const k = t + ':' + m;
      if (!vis.has(k)) { vis.add(k); q.push([t, m, d + 1]); }
    }
  }
  return Infinity;
}

async function checkFind(where, step) {
  const c = new Chess(step.fen);
  const me = c.turn();
  const sol = [];
  for (let i = 0; i < step.sol.length; i++) {
    let u = step.sol[i];
    if (u === '*') { const a = await eng.analyze(c.fen(), { depth: 14 }); u = a.best; }
    let mv;
    try { mv = c.move(uciToMove(u)); } catch (e) { mv = null; }
    if (!mv) return bad(where, `illegal move ${u} at ${i}`), null;
    sol.push(u);
  }
  const goal = step.goal || 'best';
  if (['best', 'mate', 'safe', 'good'].includes(goal) && step.alt !== false) {
    const a = await eng.analyze(step.fen, { depth: 16, multipv: 2 });
    if (!a.lines[0]) return bad(where, 'no legal moves / engine gave nothing'), null;
    const best = pov(a.lines[0].cp, me);
    const after = new Chess(step.fen); after.move(uciToMove(sol[0]));
    const got = after.isCheckmate() ? 99999 : pov((await eng.analyze(after.fen(), { depth: 16 })).lines[0]?.cp ?? 0, me);
    if (goal === 'mate' && !(isMateScore(got) && got > 0)) bad(where, `solution ${sol[0]} doesn't mate (eval ${got})`);
    if (goal === 'best' && got < best - 40) bad(where, `solution ${sol[0]} (${got}) worse than best ${a.lines[0].move} (${best})`);
    if (goal === 'best' && best < 150 && !(step.alt === false)) bad(where, `'best' puzzle isn't winning (${best}); use goal good/safe or alt:false`);
    if ((goal === 'safe' || goal === 'good') && got < best - (goal === 'safe' ? 120 : 50)) bad(where, `solution ${sol[0]} (${got}) not within range of best (${best})`);
  }
  if (goal === 'castle' && !sol.some((u, i) => i % 2 === 0)) bad(where, 'no castle');
  return { ...step, sol };
}

async function checkPlay(where, step) {
  const c = new Chess(step.fen);
  const me = c.turn();
  const a = await eng.analyze(step.fen, { depth: 18 });
  if (!a.lines[0]) return bad(where, 'illegal or finished position'), step;
  const ev = pov(a.lines[0].cp, me);
  if (step.goal === 'hold' && (ev < -120 || ev > 200)) bad(where, `hold position eval ${ev}`);
  if (step.goal !== 'hold' && ev < 300 && !(isMateScore(ev) && ev > 0)) bad(where, `${step.goal} position not winning (${ev})`);
  if (step.goal === 'mate' && isMateScore(ev) && mateIn(ev) > step.moves) bad(where, `mate needs ${mateIn(ev)} > ${step.moves} moves`);
  return step;
}

function expandMined(where, step) {
  let pool = puzzles.filter(p => p.theme === step.theme && !usedInLessons.has(p.id) && p.rating >= (step.min || 0) && p.rating <= (step.max || 9999));
  if (pool.length < step.count) bad(where, `only ${pool.length} ${step.theme} puzzles for ${step.count} wanted`);
  // spread across the difficulty range, easiest first
  const pick = [];
  for (let i = 0; i < Math.min(step.count, pool.length); i++) pick.push(pool[Math.floor(i * pool.length / step.count)]);
  pick.forEach(p => usedInLessons.add(p.id));
  return pick.map(p => ({ t: 'find', fen: p.fen, sol: p.solution, goal: p.theme.startsWith('mate') ? 'mate' : p.theme === 'defence' ? 'safe' : 'best', text: step.text }));
}

const out = { paths: [] };
let lessons = 0, steps = 0;
for (const path of PATHS) {
  const P = { ...path, units: [] };
  for (const unit of path.units) {
    const U = { ...unit, lessons: [] };
    for (const lesson of unit.lessons) {
      const L = { ...lesson, steps: [] };
      for (const [i, step] of lesson.steps.entries()) {
        const where = `${lesson.id}#${i}`;
        if (step.fen && (step.t === 'find' || step.t === 'play')) { try { new Chess(step.fen); } catch (e) { bad(where, 'bad fen ' + e.message); continue; } }
        if (step.t === 'find') { const s = await checkFind(where, step); if (s) L.steps.push(s); }
        else if (step.t === 'play') L.steps.push(await checkPlay(where, step));
        else if (step.t === 'stars') {
          const m = minStarsMoves(step);
          if (m === Infinity) bad(where, 'stars unreachable');
          else if (m > step.par) bad(where, `par ${step.par} impossible, best is ${m}`);
          else if (m < step.par) console.log(`  note ${where}: par ${step.par}, best possible ${m}`);
          L.steps.push({ ...step, par: Math.min(step.par, m) });
        }
        else if (step.t === 'mined') L.steps.push(...expandMined(where, step));
        else L.steps.push(step);
      }
      steps += L.steps.length; lessons++;
      U.lessons.push(L);
    }
    P.units.push(U);
  }
  out.paths.push(P);
}
fs.writeFileSync('content/lessons.json', JSON.stringify(out));
fs.writeFileSync('content/puzzles.json', JSON.stringify(puzzles));
console.log(`\n${lessons} lessons, ${steps} steps, ${puzzles.length} puzzles. ${problems.length ? problems.length + ' PROBLEMS' : 'all good ✓'}`);
process.exit(problems.length ? 1 : 0);
