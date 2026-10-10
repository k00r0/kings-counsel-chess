// "My mistakes": positions from your own games where you went wrong. Find the move you missed.
import { useMemo, useState } from 'preact/hooks';
import { S, update } from '../store.js';
import { back } from '../ui/nav.js';
import { Solver } from '../ui/Solver.jsx';
import { CoachFace } from '../ui/Avatar.jsx';
import { PERSONAS } from '../coach/coach.js';
import { describeMistake } from '../coach/report.js';
import { kidsMode } from '../game/session.js';
import { confetti } from '../ui/fx.js';

export function drillList(theme) {
  const out = [];
  const seen = new Set();
  for (const g of S.memory.games.slice().reverse()) {
    for (const m of g.mistakes || []) {
      if (!m.best || !m.fen) continue;
      if (theme && m.theme !== theme) continue;
      const key = m.fen.split(' ').slice(0, 4).join(' ') + m.best;
      if (seen.has(key)) continue;
      seen.add(key);
      const st = S.drills[key] || {};
      out.push({ key, ...m, game: g.n, solved: !!st.solved, tries: st.tries || 0 });
    }
  }
  return out;
}

export function Drills({ theme }) {
  const kids = kidsMode();
  const persona = S.profile.persona;
  const list = useMemo(() => drillList(theme).sort((a, b) => a.solved - b.solved), [theme]);
  const [i, setI] = useState(0);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);
  const d = list[i];
  const p = PERSONAS[persona];
  if (!list.length) return (
    <div class="page drills">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>{kids ? 'Try again' : 'My mistakes'}</h2></header>
      <div class="empty"><CoachFace persona={persona} mood="happy" size={90} /><p>{kids ? 'Nothing to fix yet! Play a game and I\'ll save the tricky moments here.' : 'Nothing here yet. When you slip in a game, I keep the position so you can find the right move later.'}</p></div>
    </div>
  );
  const say = (text, mood) => setMsg({ text, mood });
  return (
    <div class="page drills">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>{kids ? 'Try again' : 'My mistakes'}</h2><span class="count">{i + 1}/{list.length}</span></header>
      <div class="drill-coach">
        <CoachFace persona={persona} mood={msg ? msg.mood : 'thinking'} size={44} />
        <p>{msg ? msg.text : kids ? `Game ${d.game}, move ${d.moveNo}. You played ${d.played}. Can you find a better move?` : `Game ${d.game}, move ${d.moveNo}. You played ${d.played}. ${cap(p.themes[d.theme] ? p.themes[d.theme][0] : '')}. Find the better move.`}</p>
      </div>
      <Solver key={d.key} fen={d.fen} solution={[d.best]} goal={d.theme === 'missed_mate' ? 'mate' : 'best'} kids={kids} say={say}
        onDone={r => {
          update(s => { const st = s.drills[d.key] || (s.drills[d.key] = { solved: false, tries: 0 }); st.tries++; if (r.ok) st.solved = true; });
          say(r.ok ? (kids ? 'You found it! 🎉' : `Yes. ${d.bestSan}. ${p.themes[d.theme] ? cap(p.themes[d.theme][1]) : ''}`) : `${kids ? 'The best move was' : 'It was'} ${d.bestSan}.`, r.ok ? 'happy' : 'calm');
          if (r.ok && r.firstTry) confetti(kids);
          setDone(true);
        }} />
      {done && <div class="row-actions">
        {i + 1 < list.length ? <button class="btn primary" onClick={() => { setI(i + 1); setMsg(null); setDone(false); }}>Next</button> : <button class="btn primary" onClick={back}>Done</button>}
      </div>}
      <p class="fine">{describeMistake(d, kids)}</p>
    </div>
  );
}

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
