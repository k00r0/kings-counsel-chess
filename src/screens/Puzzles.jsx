// Puzzle trainer: positions mined from engine games, picked near your puzzle rating.
import { useEffect, useState } from 'preact/hooks';
import { S, update } from '../store.js';
import { back } from '../ui/nav.js';
import { Solver } from '../ui/Solver.jsx';
import { CoachFace } from '../ui/Avatar.jsx';
import { kidsMode } from '../game/session.js';
import { loadPuzzles } from '../content.js';
import { confetti } from '../ui/fx.js';

const THEME_LABEL = {
  mate1: 'Checkmate in one', mate2: 'Checkmate in two', mate3: 'Checkmate in three', hanging: 'Win the loose piece', fork: 'Find the fork',
  pin: 'Use the pin', discovered: 'Discovered attack', combination: 'Find the winning combination', quiet: 'Find the quiet killer', defence: 'Find the only defence',
};
const KID_LABEL = { mate1: 'Find checkmate!', hanging: 'Capture the free piece!', fork: 'Attack two pieces at once!', mate2: 'Checkmate in two moves!' };

function pick(all, rating, kids, theme) {
  let pool = all.filter(p => !S.puzzles.solved[p.id]);
  if (kids) pool = pool.filter(p => ['mate1', 'hanging'].includes(p.theme) || p.rating < 700);
  if (theme) pool = pool.filter(p => p.theme === theme);
  if (!pool.length) pool = all;
  const near = pool.filter(p => Math.abs(p.rating - rating) <= 150);
  const list = near.length >= 3 ? near : pool.slice().sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, 12);
  return list[Math.floor(Math.random() * list.length)];
}

export function Puzzles({ theme }) {
  const kids = kidsMode();
  const [all, setAll] = useState(null);
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null);
  useEffect(() => { loadPuzzles().then(list => { setAll(list); setP(pick(list, S.puzzles.rating, kids, theme)); }); }, []);
  if (!p) return <div class="page"><header class="bar-top"><button class="icon-btn" onClick={back}>‹</button><h2>Puzzles</h2></header><p class="loading">Setting up the board…</p></div>;
  const say = (text, mood) => setMsg({ text, mood });
  function done(r) {
    const score = r.ok && !r.hints ? 1 : 0;
    const exp = 1 / (1 + Math.pow(10, (p.rating - S.puzzles.rating) / 400));
    const delta = Math.round(20 * (score - exp));
    update(s => {
      s.puzzles.rating = Math.max(100, s.puzzles.rating + delta);
      s.puzzles.seen[p.id] = 1;
      if (r.ok) s.puzzles.solved[p.id] = 1;
      s.puzzles.streak = score ? s.puzzles.streak + 1 : 0;
      s.puzzles.best = Math.max(s.puzzles.best, s.puzzles.streak);
    });
    if (score && S.puzzles.streak % 5 === 0) confetti(kids);
    setResult({ ok: r.ok, delta });
    say(r.ok ? (kids ? 'Super! You solved it!' : `Solved. ${p.san.join(' ')}`) : `${kids ? 'The answer was' : 'The solution:'} ${p.san.join(' ')}`, r.ok ? 'happy' : 'calm');
  }
  function next() { setResult(null); setMsg(null); setP(pick(all, S.puzzles.rating, kids, theme)); }
  return (
    <div class="page puzzles">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>{kids ? 'Puzzles' : THEME_LABEL[p.theme] || 'Puzzle'}</h2>
        {!kids && <span class="count">{S.puzzles.rating}{result && <em class={result.delta >= 0 ? 'up' : 'down'}> {result.delta >= 0 ? '+' : ''}{result.delta}</em>}</span>}</header>
      <div class="drill-coach">
        <CoachFace persona={S.profile.persona} mood={msg ? msg.mood : 'thinking'} size={44} />
        <p>{msg ? msg.text : kids ? (KID_LABEL[p.theme] || 'Find the best move!') : THEME_LABEL[p.theme] + '.'}</p>
      </div>
      <Solver key={p.id} fen={p.fen} solution={p.solution} goal={p.theme.startsWith('mate') ? 'mate' : p.theme === 'defence' ? 'safe' : 'best'} kids={kids} say={say} onDone={done} />
      {result && <div class="row-actions"><button class="btn primary" onClick={next}>Next puzzle</button></div>}
      {!kids && <p class="fine">Streak {S.puzzles.streak} · best {S.puzzles.best}</p>}
    </div>
  );
}
