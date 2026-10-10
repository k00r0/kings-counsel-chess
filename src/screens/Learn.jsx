// Lessons: three paths (Squire, Knight, Master). Each lesson is a short run of steps:
// the coach explains, you try it on the board, the engine checks your answer.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { S, update } from '../store.js';
import { go, back } from '../ui/nav.js';
import { loadLessons } from '../content.js';
import { CoachFace } from '../ui/Avatar.jsx';
import { Solver } from '../ui/Solver.jsx';
import { Board } from '../ui/Board.jsx';
import { speak, stop as stopVoice } from '../services/voice.js';
import { sound } from '../services/sound.js';
import { confetti } from '../ui/fx.js';
import { attacksFrom } from '../chess/core.js';
import { PlayOut } from '../ui/PlayOut.jsx';
import { kidsMode } from '../game/session.js';

const PATHS = { squire: 'Squire', knight: 'Knight', master: 'Master' };

export function Learn() {
  const [data, setData] = useState(null);
  const [path, setPath] = useState(S.profile.path);
  useEffect(() => { loadLessons().then(setData); }, []);
  if (!data) return <div class="page"><header class="bar-top"><h2>Lessons</h2></header><p class="loading">Opening the books…</p></div>;
  const p = data.paths.find(x => x.id === path) || data.paths[0];
  const kids = path === 'squire';
  let nextFound = false;
  return (
    <div class={'page learn' + (kids ? ' kids' : '')}>
      <header class="bar-top"><h2>{kids ? 'Quests' : 'Lessons'}</h2></header>
      <div class="seg">
        {data.paths.map(x => <button key={x.id} class={path === x.id ? 'on' : ''} onClick={() => setPath(x.id)}>{PATHS[x.id]}</button>)}
      </div>
      <p class="path-blurb">{p.blurb}</p>
      {p.units.map(u => (
        <section class="unit" key={u.id}>
          <h3><span class="ui">{u.icon}</span>{u.title}</h3>
          {u.blurb && <p class="fine">{u.blurb}</p>}
          <div class="lesson-list">
            {u.lessons.map(l => {
              const st = S.lessons[l.id];
              const isNext = !st && !nextFound; if (isNext) nextFound = true;
              return (
                <button key={l.id} class={'lesson-btn' + (st ? ' done' : '') + (isNext ? ' next' : '')} onClick={() => go('lesson', { id: l.id })}>
                  <span class="lt">{l.title}</span>
                  <span class="ls">{st ? '★'.repeat(st.stars) + '☆'.repeat(3 - st.stars) : isNext ? 'Start' : ''}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Lesson({ id }) {
  const [data, setData] = useState(null);
  useEffect(() => { loadLessons().then(setData); }, []);
  const lesson = useMemo(() => {
    if (!data) return null;
    for (const p of data.paths) for (const u of p.units) for (const l of u.lessons) if (l.id === id) return { ...l, path: p.id, unit: u };
    return null;
  }, [data, id]);
  if (!lesson) return <div class="page"><p class="loading">…</p></div>;
  return <LessonRun lesson={lesson} key={id} />;
}

function LessonRun({ lesson }) {
  const kids = lesson.path === 'squire' || kidsMode();
  const persona = kids ? 'hopper' : S.profile.persona === 'hopper' ? 'hopper' : 'vizier';
  const [i, setI] = useState(0);
  const [msg, setMsg] = useState(null);
  const [stepDone, setStepDone] = useState(false);
  const [talking, setTalking] = useState(false);
  const [misses, setMisses] = useState(0);
  const step = lesson.steps[i];
  const finished = i >= lesson.steps.length;

  const say = (text, mood = 'calm') => {
    setMsg({ text, mood });
    speak(text, persona, { onStart: () => setTalking(true), onEnd: () => setTalking(false) });
  };
  useEffect(() => {
    if (finished) {
      const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
      update(s => { const prev = s.lessons[lesson.id]; s.lessons[lesson.id] = { done: true, stars: Math.max(stars, prev ? prev.stars : 0) }; });
      confetti(kids); sound.win();
      say(kids ? 'You finished the quest! Hooray!' : pick(['Lesson complete. Well done.', 'That\'s the lesson. You\'ve earned a game now.', 'Good work. Now use it in a real game.']), 'happy');
      return;
    }
    setStepDone(step.t === 'say');
    say(kids && step.kids ? step.kids : step.text || step.prompt || '', step.t === 'say' ? 'calm' : 'thinking');
    return () => stopVoice();
  }, [i]);

  const next = () => { sound.tap(); setI(i + 1); };
  const onDone = r => {
    if (!r.ok || !r.firstTry) setMisses(m => m + (r.fails || 0) + (r.hints || 0) + (r.ok ? 0 : 2));
    setStepDone(true);
    say(r.ok ? (step.done || pick(kids ? ['Yes! Great job!', 'You did it!', 'Super!'] : ['Exactly.', 'Correct.', 'Well found.'])) : (step.fail || (kids ? "That's okay! Let's keep going." : "That's the idea. Let's move on.")), r.ok ? 'happy' : 'calm');
  };

  return (
    <div class={'page lesson' + (kids ? ' kids' : '')}>
      <header class="bar-top">
        <button class="icon-btn" onClick={() => { stopVoice(); back(); }} aria-label="Back">‹</button>
        <h2>{lesson.title}</h2>
        <div class="progress-dots">{lesson.steps.map((_, j) => <i key={j} class={j < i ? 'done' : j === i ? 'on' : ''} />)}</div>
      </header>
      <div class="lesson-coach">
        <CoachFace persona={persona} mood={msg ? msg.mood : 'calm'} talking={talking} size={kids ? 70 : 56} />
        <p>{msg ? msg.text : ''}</p>
      </div>
      {!finished && step.t === 'say' && step.fen && <div class="board-wrap"><Board fen={step.fen} flip={step.flip} interactive={false} arrows={step.arrows || []} marks={step.marks || []} set={S.settings.pieces} theme={S.settings.board} coords={S.settings.coords} kids={kids} /></div>}
      {!finished && step.t === 'find' && <Solver key={i} fen={step.fen} solution={step.sol} goal={step.goal || 'best'} kids={kids} say={(t, m) => setMsg({ text: t, mood: m })} onDone={onDone} hint={step.hint} alternatives={step.alt !== false} />}
      {!finished && step.t === 'stars' && <StarsQuest key={i} step={step} kids={kids} onDone={onDone} />}
      {!finished && step.t === 'play' && <PlayOut key={i} step={step} kids={kids} say={(t, m) => say(t, m)} onDone={onDone} />}
      <div class="row-actions">
        {finished ? <>
          <div class="lesson-stars">{'★'.repeat(S.lessons[lesson.id] ? S.lessons[lesson.id].stars : 3)}</div>
          <button class="btn primary big" onClick={() => go('setup', { mode: 'coached' }, { replace: true })}>{kids ? 'Play a game!' : 'Play a game'}</button>
          <button class="btn soft" onClick={back}>Back to lessons</button>
        </> : stepDone && <button class="btn primary big" onClick={next}>{i + 1 >= lesson.steps.length ? 'Finish' : kids ? 'Next!' : 'Continue'}</button>}
      </div>
    </div>
  );
}

/** Kids' quest: move one piece around the board to collect every star, avoiding rocks. */
function StarsQuest({ step, kids, onDone }) {
  const [hero, setHero] = useState(step.start);
  const [stars, setStars] = useState(step.stars);
  const [moves, setMoves] = useState(0);
  const [last, setLast] = useState(null);
  const code = step.piece; // e.g. 'wr'
  const fen = useMemo(() => {
    const rows = Array.from({ length: 8 }, () => Array(8).fill(''));
    const [x, y] = ['abcdefgh'.indexOf(hero[0]), 8 - +hero[1]];
    rows[y][x] = code[0] === 'w' ? code[1].toUpperCase() : code[1];
    return rows.map(r => { let s = '', e = 0; for (const c of r) { if (!c) e++; else { if (e) s += e; e = 0; s += c; } } return s + (e || ''); }).join('/') + ' w - - 0 1';
  }, [hero]);
  const dests = useMemo(() => {
    const map = { [hero]: { type: code[1], color: 'w' } };
    for (const r of step.rocks || []) map[r] = { type: 'p', color: 'w' };   // own pieces block, can't be taken
    const to = attacksFrom(map, hero).filter(s => !map[s]);
    return new Map([[hero, to]]);
  }, [hero]);
  const marks = stars.map(s => ({ sq: s, kind: 'star' })).concat((step.rocks || []).map(s => ({ sq: s, kind: 'rock' })));
  function onMove({ from, to }) {
    sound.move();
    setHero(to); setLast([from, to]); setMoves(moves + 1);
    if (stars.includes(to)) {
      const left = stars.filter(s => s !== to);
      setStars(left); sound.ok();
      if (!left.length) setTimeout(() => onDone({ ok: true, firstTry: moves + 1 <= (step.par || 99), fails: Math.max(0, moves + 1 - (step.par || 99)), hints: 0 }), 300);
    }
  }
  return (
    <div class="stars-quest">
      <div class="board-wrap">
        <Board fen={fen} interactive={stars.length > 0} movable="w" onMove={onMove} dests={dests} lastMove={last} marks={marks}
          set={kids ? 'kids' : S.settings.pieces} theme={kids ? 'meadow' : S.settings.board} coords={!kids} kids={kids} />
      </div>
      <div class="solver-bar"><span>⭐ {step.stars.length - stars.length}/{step.stars.length}</span><span>Moves: {moves}{step.par ? ` (try ${step.par})` : ''}</span>
        <button class="link" onClick={() => { setHero(step.start); setStars(step.stars); setMoves(0); setLast(null); }}>Start over</button></div>
    </div>
  );
}

const pick = a => a[Math.floor(Math.random() * a.length)];
