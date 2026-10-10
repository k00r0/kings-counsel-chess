// First run: who's playing, how much they know, and meeting the coach.
import { useState } from 'preact/hooks';
import { S, update } from '../store.js';
import { CoachFace } from '../ui/Avatar.jsx';
import { speak } from '../services/voice.js';
import { sound } from '../services/sound.js';
import { applyTheme } from '../ui/theme.js';
import { Logo } from '../ui/Logo.jsx';

const AGES = [
  { id: 'u10', label: 'Under 10', age: 8 },
  { id: '10-12', label: '10 to 12', age: 11 },
  { id: '13-17', label: '13 to 17', age: 15 },
  { id: '18+', label: '18 or older', age: 25 },
];
const LEVELS = [
  { id: 'new', label: "I'm brand new", sub: "I'd like to learn how the pieces move", rating: 300 },
  { id: 'rules', label: 'I know the rules', sub: "but I don't win much yet", rating: 550 },
  { id: 'casual', label: 'I play sometimes', sub: 'with friends, family or online', rating: 800 },
  { id: 'regular', label: 'I play a lot', sub: 'I know some openings and tactics', rating: 1100 },
  { id: 'rated', label: 'I have a rating', sub: 'from chess.com, Lichess or a club', rating: null },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [ageId, setAge] = useState(null);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(null);
  const [rated, setRated] = useState('');
  const [talk, setTalk] = useState('normal');
  const age = AGES.find(a => a.id === ageId);
  const young = age && age.age < 13;
  const persona = young ? 'hopper' : 'vizier';

  function finish() {
    const lv = LEVELS.find(l => l.id === level) || LEVELS[2];
    let rating = lv.rating ?? Math.max(400, Math.min(2200, parseInt(rated, 10) || 1000));
    let path = 'knight';
    if (age.age < 10 || (young && ['new', 'rules'].includes(level))) path = 'squire';
    else if (rating >= 1300) path = 'master';
    if (path === 'squire') rating = Math.min(rating, 500);
    update(s => {
      s.profile = { ...s.profile, name: name.trim().slice(0, 20), age: age.age, path, persona, level: lv.id };
      s.settings.talk = talk;
      s.settings.pieces = path === 'squire' ? 'kids' : 'classic';
      s.settings.board = path === 'squire' ? 'meadow' : 'royal';
      s.settings.ai = !young;
      s.rating = rating; s.startRating = rating; s.puzzles.rating = rating;
      s.onboarded = true;
    });
    applyTheme();
  }

  const next = () => { sound.tap(); setStep(step + 1); };

  return (
    <div class={'onboard' + (young ? ' kids' : '')}>
      {step === 0 && (
        <div class="ob-card hero">
          <Logo size={88} />
          <h1>King's Counsel <span>Chess</span></h1>
          <p class="lead">A wise coach at your side for every move. He warns you before you blunder, lets you take it back, and remembers what you need to work on.</p>
          <button class="btn primary big" onClick={next}>Get started</button>
        </div>
      )}
      {step === 1 && (
        <div class="ob-card">
          <h2>Who's playing?</h2>
          <p class="sub">This picks the right coach and keeps ads suitable for your age.</p>
          <div class="options">
            {AGES.map(a => <button key={a.id} class={'opt' + (ageId === a.id ? ' on' : '')} onClick={() => { sound.tap(); setAge(a.id); }}>{a.label}</button>)}
          </div>
          <label class="field"><span>{age && age.age < 13 ? "What's your first name? (optional)" : 'What should the coach call you? (optional)'}</span>
            <input value={name} onInput={e => setName(e.currentTarget.value)} maxLength={20} placeholder="First name or nickname" autocomplete="off" />
          </label>
          <button class="btn primary big" disabled={!ageId} onClick={next}>Next</button>
        </div>
      )}
      {step === 2 && (
        <div class="ob-card">
          <h2>{young ? 'Do you know how to play?' : 'How much chess do you play?'}</h2>
          <div class="options col">
            {LEVELS.filter(l => !(young && l.id === 'rated')).map(l => (
              <button key={l.id} class={'opt row' + (level === l.id ? ' on' : '')} onClick={() => { sound.tap(); setLevel(l.id); }}>
                <b>{l.label}</b><small>{l.sub}</small>
              </button>
            ))}
          </div>
          {level === 'rated' && <label class="field"><span>Your rating (roughly)</span><input type="number" inputMode="numeric" value={rated} onInput={e => setRated(e.currentTarget.value)} placeholder="e.g. 1150" /></label>}
          <button class="btn primary big" disabled={!level || (level === 'rated' && !rated)} onClick={next}>Next</button>
        </div>
      )}
      {step === 3 && (
        <div class="ob-card meet">
          <div class="big-face"><CoachFace persona={persona} mood="happy" size={140} /></div>
          <h2>{young ? 'Meet Hopper!' : 'Meet the Vizier'}</h2>
          <p class="lead">{young
            ? "Hopper is a little knight who loves chess. He'll warn you when a piece is in danger, help you try again, and cheer when you win!"
            : "He has advised kings for longer than anyone remembers. He'll speak up before a mistake costs you, explain why, and keep notes on what you need to practise."}</p>
          <button class="btn soft" onClick={() => speak(young ? `Hi${name ? ' ' + name : ''}! I'm Hopper! Let's play chess together!` : `Good to meet you${name ? ', ' + name : ''}. Shall we see what you can do?`, persona)}>🔊 Hear {young ? 'Hopper' : 'him'}</button>
          {!young && (
            <>
              <h3>How chatty should he be?</h3>
              <div class="seg big">
                {[['quiet', 'Quiet', 'Only when it matters'], ['normal', 'Normal', 'Every move or two'], ['chatty', 'Chatty', 'Lots of tips']].map(([id, l, sub]) => (
                  <button key={id} class={talk === id ? 'on' : ''} onClick={() => setTalk(id)}><b>{l}</b><small>{sub}</small></button>
                ))}
              </div>
            </>
          )}
          <button class="btn primary big" onClick={finish}>{young ? "Let's play!" : 'Begin'}</button>
        </div>
      )}
      <div class="dots-nav">{[0, 1, 2, 3].map(i => <i key={i} class={i === step ? 'on' : ''} />)}</div>
    </div>
  );
}
