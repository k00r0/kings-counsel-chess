// The journal: past games, advisor's reports, and the rating over time.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { S, update } from '../store.js';
import { go, back } from '../ui/nav.js';
import { Board } from '../ui/Board.jsx';
import { CoachFace } from '../ui/Avatar.jsx';
import { PERSONAS } from '../coach/coach.js';
import { describeMistake } from '../coach/report.js';
import { kidsMode, gamesUntilReport } from '../game/session.js';
import { aiAvailable, reportNarrative } from '../services/ai.js';
import { MiniBoard } from '../ui/MiniBoard.jsx';

const ICON = { win: '🏆', loss: '·', draw: '½' };
const dateOf = d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function Journal() {
  const kids = kidsMode();
  const [tab, setTab] = useState('games');
  const games = S.memory.games.slice().reverse();
  const reports = S.memory.reports.slice().reverse();
  return (
    <div class="page journal">
      <header class="bar-top"><h2>Journal</h2></header>
      <div class="seg">
        <button class={tab === 'games' ? 'on' : ''} onClick={() => setTab('games')}>Games</button>
        <button class={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>{kids ? 'Reports' : "Advisor's reports"}</button>
        {!kids && <button class={tab === 'progress' ? 'on' : ''} onClick={() => setTab('progress')}>Progress</button>}
      </div>
      {tab === 'games' && (games.length ? (
        <div class="list">
          {games.map(g => (
            <button class={'game-row ' + g.result} key={g.n} onClick={() => go('review', { n: g.n })}>
              <span class="gi">{ICON[g.result] || '·'}</span>
              <span class="gm"><b>{g.oppName || 'Opponent'}</b><small>{dateOf(g.date)} · {g.mode === 'test' ? 'Test' : 'Coached'} · {Math.ceil(g.plies / 2)} moves</small></span>
              {!kids && <span class="ga">{g.accuracy}%</span>}
            </button>
          ))}
        </div>
      ) : <p class="empty-text">{kids ? 'Play a game and it will show up here!' : 'Your games will appear here.'}</p>)}
      {tab === 'reports' && (
        <div class="list">
          {!reports.length && <p class="empty-text">{`Your first report arrives after 10 games. ${gamesUntilReport()} to go.`}</p>}
          {reports.map(r => (
            <button class="report-row" key={r.number} onClick={() => go('report', { n: r.number })}>
              <span class="gi">📜</span><span class="gm"><b>Report #{r.number}</b><small>{dateOf(r.date)} · games {r.games[0]}–{r.games[r.games.length - 1]}</small></span>
              {!kids && <span class="ga">{r.rating}</span>}
            </button>
          ))}
        </div>
      )}
      {tab === 'progress' && <Progress />}
    </div>
  );
}

function Progress() {
  const pts = S.ratingHistory.slice(-60);
  if (pts.length < 2) return <p class="empty-text">Play a few games to see your rating line.</p>;
  const rs = pts.map(p => p.r);
  const lo = Math.min(...rs, S.startRating) - 30, hi = Math.max(...rs) + 30;
  const W = 320, H = 140;
  const xy = (r, i) => [i / (pts.length - 1) * W, H - (r - lo) / (hi - lo) * H];
  const d = pts.map((p, i) => xy(p.r, i).join(',')).join(' ');
  const themes = Object.entries(S.memory.themes).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const P = PERSONAS[S.profile.persona];
  return (
    <div class="progress">
      <div class="big-num"><small>Rating</small><b>{S.rating}</b><span class={S.rating >= S.startRating ? 'up' : 'down'}>{S.rating >= S.startRating ? '+' : ''}{S.rating - S.startRating} since you started</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} class="chart" preserveAspectRatio="none">
        <polyline points={d} fill="none" stroke="var(--gold)" stroke-width="2.5" vector-effect="non-scaling-stroke" />
        {pts.map((p, i) => p.mode === 'test' ? <circle key={i} cx={xy(p.r, i)[0]} cy={xy(p.r, i)[1]} r="3" fill="var(--gold)" /> : null)}
      </svg>
      <p class="fine">Dots are Test games. Coached games move your rating gently.</p>
      <div class="stat-grid">
        <div><b>{S.stats.games}</b><small>games</small></div><div><b>{S.stats.wins}</b><small>wins</small></div>
        <div><b>{S.testGames}</b><small>test games</small></div><div><b>{S.puzzles.rating}</b><small>puzzle rating</small></div>
      </div>
      {themes.length > 0 && <>
        <h3>Most common slips (all time)</h3>
        {themes.map(([t, v]) => <div class="theme-bar" key={t}><span>{cap(P.themes[t] ? P.themes[t][0] : t)}</span><b>{v.count}</b></div>)}
      </>}
    </div>
  );
}

export function Review({ n }) {
  const kids = kidsMode();
  const g = S.memory.games.find(x => x.n === n);
  const moves = useMemo(() => {
    if (!g) return [];
    const c = new Chess(g.startFen || undefined);
    try { c.loadPgn(g.pgn); } catch (e) { return []; }
    return c.history({ verbose: true });
  }, [n]);
  const [ply, setPly] = useState(moves.length);
  const fenAt = useMemo(() => {
    const c = new Chess(g && g.startFen || undefined);
    for (const m of moves.slice(0, ply)) c.move(m.san);
    return c.fen();
  }, [ply, moves]);
  if (!g) return <div class="page"><header class="bar-top"><button class="icon-btn" onClick={back}>‹</button><h2>Game</h2></header><p>Not found.</p></div>;
  const mistakeAt = Object.fromEntries((g.mistakes || []).filter(m => !m.takenBack).map(m => [m.ply, m]));
  const cur = mistakeAt[ply];
  const lm = moves[ply - 1];
  const arrows = cur && cur.best ? [{ uci: cur.best, color: 'good' }] : [];
  return (
    <div class="page review">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>vs {g.oppName}</h2><span class="count">{g.result}</span></header>
      <div class="board-wrap">
        <Board fen={cur ? cur.fen : fenAt} flip={g.color === 'b'} interactive={false} lastMove={cur ? null : lm ? [lm.from, lm.to] : null} arrows={arrows}
          set={S.settings.pieces} theme={S.settings.board} coords={S.settings.coords} kids={kids} />
      </div>
      <div class="nav-row">
        <button class="btn soft" onClick={() => setPly(0)}>⏮</button>
        <button class="btn soft" onClick={() => setPly(Math.max(0, ply - 1))}>◀</button>
        <span>{ply ? `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${moves[ply - 1].san}` : 'Start'}</span>
        <button class="btn soft" onClick={() => setPly(Math.min(moves.length, ply + 1))}>▶</button>
        <button class="btn soft" onClick={() => setPly(moves.length)}>⏭</button>
      </div>
      {cur && <div class="review-note"><b>{cur.kind === 'blunder' ? '??' : '?'} {cur.played}</b> {describeMistake(cur, kids)} <em>Better: {cur.bestSan}</em></div>}
      <h3>{kids ? 'Tricky moments' : 'Key moments'}</h3>
      <div class="list">
        {(g.mistakes || []).length === 0 && <p class="empty-text">No serious mistakes in this game.</p>}
        {(g.mistakes || []).map((m, i) => (
          <button key={i} class="moment" onClick={() => setPly(m.ply)}>
            <b>{m.moveNo}. {m.played}</b><span>{describeMistake(m, kids).replace(/^Move \d+, [^:]+: /, '')}{m.takenBack ? ' (taken back)' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Report({ n }) {
  const kids = kidsMode();
  const r = S.memory.reports.find(x => x.number === n);
  const [narr, setNarr] = useState(r && r.narrative);
  const persona = S.profile.persona;
  useEffect(() => {
    if (!r || r.narrative || !aiAvailable()) return;
    reportNarrative(r, persona).then(text => { if (text) { update(() => { r.narrative = text; }); setNarr(text); } }).catch(() => {});
  }, [n]);
  if (!r) return <div class="page"><header class="bar-top"><button class="icon-btn" onClick={back}>‹</button><h2>Report</h2></header></div>;
  const P = PERSONAS[persona];
  return (
    <div class="page report">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>{kids ? `Report #${r.number}` : `The advisor's report · #${r.number}`}</h2></header>
      <div class="report-head">
        <CoachFace persona={persona} mood="calm" size={64} />
        <div><p class="headline">{r.headline}</p>{r.verdict && <p class="verdict">{r.verdict}</p>}</div>
      </div>
      {narr && <div class="narrative">{narr.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>}

      {r.followUp && r.followUp.length > 0 && <section><h3>{kids ? 'Since last time' : 'Since my last report'}</h3>
        {r.followUp.map((f, i) => <p key={i} class={'follow ' + (f.good ? 'good' : f.good === false ? 'bad' : '')}>{f.good ? '▲ ' : f.good === false ? '▼ ' : '• '}{f.text}</p>)}
      </section>}

      {!kids && <section class="nums">
        <div><small>Accuracy</small><b>{r.accuracy}%</b>{r.accuracyBefore != null && <span class={r.accuracy >= r.accuracyBefore ? 'up' : 'down'}>{r.accuracy >= r.accuracyBefore ? '+' : ''}{r.accuracy - r.accuracyBefore}</span>}</div>
        <div><small>Rating</small><b>{r.rating}</b><span class={r.rating >= r.ratingBefore ? 'up' : 'down'}>{r.rating >= r.ratingBefore ? '+' : ''}{r.rating - r.ratingBefore}</span></div>
        {Object.entries(r.phase).map(([ph, v]) => <div key={ph}><small>{ph}</small><b>{v}%</b></div>)}
      </section>}

      <section><h3>{kids ? 'Things that went wrong' : 'Blind spots'}</h3>
        {r.spots.length === 0 && <p>No serious mistakes. Remarkable.</p>}
        {r.spots.map(s => (
          <div class="spot" key={s.theme}>
            <span class="lbl">{s.label}</span>
            <span class="bar"><i style={{ width: Math.min(100, s.perGame * 40) + '%' }} /></span>
            <span class="val">{kids ? '' : `${s.perGame}/game`}{s.trend === 'down' ? ' ▼' : s.trend === 'up' ? ' ▲' : ''}</span>
          </div>
        ))}
      </section>

      <section><h3>{kids ? 'How you play' : 'Your style'}</h3>{r.style.map((s, i) => <p key={i}>{s}</p>)}</section>

      <section><h3>{kids ? 'Three things to practise' : 'Three things to focus on'}</h3>
        {r.focus.map((f, i) => (
          <div class="focus" key={i}>
            <b>{i + 1}. {f.title}</b>
            <p>{f.habit}</p>
            {f.drills.length > 0 && <>
              <div class="drill-thumbs">{f.drills.map((d, j) => <div key={j} class="thumb"><MiniBoard fen={d.fen} /><small>Game {d.game}, move {d.moveNo}</small></div>)}</div>
              <button class="btn soft small" onClick={() => go('drills', { theme: f.theme })}>Practise these positions</button>
            </>}
            {f.lesson && <button class="btn soft small" onClick={() => go('learn')}>Go to lessons</button>}
          </div>
        ))}
      </section>
      <p class="fine">{P.name} · next report after 10 more games.</p>
    </div>
  );
}

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
