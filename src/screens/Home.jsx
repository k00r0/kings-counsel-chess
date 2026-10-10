// Home: play, learn, and the coach's word of the day.
import { useState } from 'preact/hooks';
import { S, update, isPro } from '../store.js';
import { go, back, openSheet } from '../ui/nav.js';
import { CoachFace, OppFace } from '../ui/Avatar.jsx';
import { Logo } from '../ui/Logo.jsx';
import { gamesUntilReport, suggestedOpponent, kidsMode, TIME_CONTROLS, suggestedElo } from '../game/session.js';
import { rosterFor } from '../game/opponents.js';
import { openingReminder } from '../coach/memory.js';
import { PERSONAS } from '../coach/coach.js';
import { drillList } from './Drills.jsx';
import { sound } from '../services/sound.js';

function coachLine() {
  const kids = kidsMode();
  const p = PERSONAS[S.profile.persona];
  const name = S.profile.name;
  if (!S.gameNo) return kids ? `Hi${name ? ' ' + name : ''}! Want to play a game with me?` : `Welcome${name ? ', ' + name : ''}. Shall we play your first game?`;
  const r = openingReminder(S.memory, S.gameNo + 1);
  const last = S.memory.games[S.memory.games.length - 1];
  if (r && r.kind === 'pattern') return kids ? `Let's practise this today: ${p.themes[r.theme][1]}!` : `Something to work on: ${p.themes[r.theme][0]}. ${p.themes[r.theme][1]}`;
  if (r && r.kind === 'improving') return kids ? `You stopped ${p.themes[r.theme][0]}! Great job!` : `You've stopped ${p.themes[r.theme][0]}. Good. Let's find the next thing.`;
  if (last && last.result === 'win') return kids ? 'You won last time! Can you do it again?' : 'You won the last one. Let\'s make it two.';
  if (last && last.result === 'loss') return kids ? "Last game was tricky. Let's try again!" : 'The last one got away. Ready to try again?';
  return kids ? "Ready to play?" : 'Ready when you are.';
}

export function Home() {
  const kids = kidsMode();
  const left = gamesUntilReport();
  const drills = drillList().filter(d => !d.solved).length;
  const persona = S.profile.persona;
  return (
    <div class="page home">
      <header class="home-top">
        <Logo size={36} />
        <div class="brand">King's Counsel <span>Chess</span></div>
        {!kids && <button class="rating-chip" onClick={() => go('journal')}><small>Rating</small>{S.rating}</button>}
        {kids && <div class="stars-chip">⭐ {S.stats.wins}</div>}
      </header>

      {S.current && (
        <button class="resume" onClick={() => go('game', { setup: { mode: S.current.meta.mode, resume: S.current, opponentId: S.current.meta.opp, tcId: S.current.meta.tcId } })}>
          <b>Game in progress</b><span>Tap to continue · move {Math.ceil(S.current.moves.length / 2)}</span>
        </button>
      )}

      <div class="coach-card">
        <CoachFace persona={persona} mood="happy" size={kids ? 84 : 72} />
        <div class="bubble"><div class="who">{PERSONAS[persona].name}</div><p>{coachLine()}</p></div>
      </div>

      <button class="play-main" onClick={() => { sound.tap(); go('setup', { mode: 'coached' }); }}>
        <span class="pm-title">{kids ? 'Play with Hopper' : 'Play with the coach'}</span>
        <span class="pm-sub">{kids ? 'Hopper helps you every move' : 'Warnings, take-backs, advice. Win and learn.'}</span>
      </button>
      {!kids && (
        <button class="play-test" onClick={() => { sound.tap(); go('setup', { mode: 'test' }); }}>
          <span><b>Test yourself</b><small>No help. Counts for your rating.</small></span><span class="arrow">›</span>
        </button>
      )}

      <div class="tiles">
        <button class="tile" onClick={() => go('learn')}><span class="ti">📜</span><b>{kids ? 'Quests' : 'Lessons'}</b><small>{pathName()}</small></button>
        <button class="tile" onClick={() => go('puzzles')}><span class="ti">🧩</span><b>Puzzles</b><small>{kids ? 'Find the best move' : `Puzzle rating ${S.puzzles.rating}`}</small></button>
        <button class="tile" onClick={() => go('drills')}><span class="ti">🎯</span><b>{kids ? 'Try again' : 'My mistakes'}</b><small>{drills ? `${drills} to fix` : kids ? 'All fixed!' : 'From your games'}</small></button>
        <button class="tile" onClick={() => go('journal')}><span class="ti">📖</span><b>Journal</b><small>{S.gameNo ? `${S.gameNo} game${S.gameNo > 1 ? 's' : ''}` : 'Your games'}</small></button>
      </div>

      {!kids && (
        <div class="report-progress" onClick={() => go('journal')}>
          <div><b>Advisor's report</b><small>{left === 0 ? 'Ready in your journal' : `In ${left} more game${left > 1 ? 's' : ''}`}</small></div>
          <div class="bar"><i style={{ width: `${(10 - left) * 10}%` }} /></div>
        </div>
      )}
      {!isPro() && <button class="pro-strip" onClick={() => openSheet({ type: 'paywall' })}>👑 <b>Go Pro</b> · no ads, unlimited take-backs, premium voice</button>}
    </div>
  );
}

export function pathName() {
  return { squire: 'Squire path', knight: 'Knight path', master: 'Master path' }[S.profile.path];
}

export function Setup({ mode }) {
  const kids = kidsMode();
  const roster = rosterFor(kids);
  const rec = suggestedOpponent(mode);
  const [opp, setOpp] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [color, setColor] = useState(S.lastSetup && S.lastSetup.color || 'w');
  const tcs = mode === 'test' ? TIME_CONTROLS.filter(t => t.id !== 'untimed') : TIME_CONTROLS;
  const [tc, setTc] = useState((S.lastSetup && tcs.find(t => t.id === S.lastSetup.tcId) || tcs[0]).id);
  const chosen = opp ? roster.find(c => c.id === opp) : rec;
  function start() {
    sound.tap();
    update(s => { s.lastSetup = { color, tcId: tc }; s.current = null; });
    go('game', { setup: { mode, tcId: kids ? 'untimed' : tc, color, opponentId: opp } }, { replace: true });
  }
  return (
    <div class="page setup">
      <header class="bar-top"><button class="icon-btn" onClick={back} aria-label="Back">‹</button><h2>{mode === 'test' ? 'Test yourself' : kids ? 'Who do you want to play?' : 'New game'}</h2></header>
      {mode === 'test' && <p class="note">No coach, no take-backs, no hints. The result changes your rating. The Vizier will review it afterwards.</p>}

      <h3>Opponent</h3>
      <button class={'opp-card' + (!opp ? ' on' : '')} onClick={() => setOpp(null)}>
        <OppFace who={rec} size={52} />
        <span><b>{rec.name}</b><small>{kids ? rec.blurb : `Matched to you · about ${suggestedElo(mode)}`}</small></span>
        <span class="badge">{kids ? 'Best match' : 'Recommended'}</span>
      </button>
      {!showAll ? <button class="link" onClick={() => setShowAll(true)}>Choose someone else</button> : (
        <div class="roster">
          {roster.map(c => (
            <button key={c.id} class={'opp-row' + (opp === c.id ? ' on' : '')} onClick={() => setOpp(c.id)}>
              <OppFace who={c} size={40} /><span><b>{c.name}</b><small>{kids ? c.blurb : `${c.elo} · ${c.blurb}`}</small></span>
            </button>
          ))}
        </div>
      )}

      <h3>{kids ? 'Your colour' : 'Play as'}</h3>
      <div class="seg">
        {[['w', 'White'], ['random', 'Random'], ['b', 'Black']].map(([id, l]) => <button key={id} class={color === id ? 'on' : ''} onClick={() => setColor(id)}>{l}</button>)}
      </div>

      {!kids && (<>
        <h3>Time</h3>
        <div class="tc-grid">
          {tcs.map(t => <button key={t.id} class={'tc' + (tc === t.id ? ' on' : '')} onClick={() => setTc(t.id)}><b>{t.label}</b><small>{t.sub}</small></button>)}
        </div>
        {mode === 'coached' && tc !== 'untimed' && <p class="fine">Your clock stops whenever the coach is talking.</p>}
      </>)}

      <button class="btn primary big sticky" onClick={start}>{kids ? `Play with ${chosen.name.split(' ')[0]}!` : `Play ${chosen.name}`}</button>
    </div>
  );
}
