// The coaches' faces. Moods: calm, happy, worried, thinking, sly. `talking` animates the mouth.
import { initials } from '../game/opponents.js';

const BROWS = {
  calm: ['M30 41 Q36 38.5 42 41', 'M58 41 Q64 38.5 70 41'],
  happy: ['M30 40 Q36 36.5 42 40', 'M58 40 Q64 36.5 70 40'],
  worried: ['M30 38 Q36 40 42 42', 'M58 42 Q64 40 70 38'],
  thinking: ['M30 41 Q36 39 42 41', 'M58 37 Q64 35 70 38'],
  sly: ['M30 39 Q36 41 42 40', 'M58 40 Q64 37 70 39'],
};

export function Vizier({ mood = 'calm', talking = false, size = 64 }) {
  const [b1, b2] = BROWS[mood] || BROWS.calm;
  const eyeY = mood === 'happy' ? 47 : 47.5;
  const closed = mood === 'happy';
  return (
    <svg class={'avatar vizier' + (talking ? ' talking' : '')} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="vzbg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#2c4a6e" /><stop offset="1" stop-color="#14243b" /></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#vzbg)" />
      {/* robe */}
      <path d="M12 100 Q16 74 50 70 Q84 74 88 100Z" fill="#1f6f6b" />
      <path d="M42 72 L50 100 L58 72" fill="#d4a63a" opacity=".9" />
      {/* hood */}
      <path d="M20 62 Q18 22 50 16 Q82 22 80 62 Q78 74 68 78 L32 78 Q22 74 20 62Z" fill="#17524f" />
      <path d="M24 60 Q24 28 50 23 Q76 28 76 60" fill="none" stroke="#d4a63a" stroke-width="2" />
      {/* face */}
      <ellipse cx="50" cy="50" rx="21" ry="23" fill="#e8c39e" />
      <path d="M31 46 Q30 34 50 31 Q70 34 69 46 Q64 38 50 37 Q36 38 31 46Z" fill="#cfd6dc" />
      {/* brows */}
      <path d={b1} stroke="#e9eef2" stroke-width="3.2" fill="none" stroke-linecap="round" />
      <path d={b2} stroke="#e9eef2" stroke-width="3.2" fill="none" stroke-linecap="round" />
      {/* eyes + spectacles */}
      {closed
        ? <><path d="M32 48 Q36 45 40 48" stroke="#2b1d12" stroke-width="2" fill="none" stroke-linecap="round" /><path d="M60 48 Q64 45 68 48" stroke="#2b1d12" stroke-width="2" fill="none" stroke-linecap="round" /></>
        : <g class="blink"><circle cx="36" cy={eyeY} r="2.6" fill="#2b1d12" /><circle cx="64" cy={eyeY} r="2.6" fill="#2b1d12" /></g>}
      <circle cx="36" cy="48" r="7" fill="none" stroke="#b08a3e" stroke-width="1.6" />
      <circle cx="64" cy="48" r="7" fill="none" stroke="#b08a3e" stroke-width="1.6" />
      <path d="M43 48 Q50 45.5 57 48" stroke="#b08a3e" stroke-width="1.6" fill="none" />
      {/* nose */}
      <path d="M50 50 Q47 58 50 60 Q53 60 54 58" stroke="#c9976e" stroke-width="1.8" fill="none" stroke-linecap="round" />
      {/* beard + moustache, mouth peeks through */}
      <path d="M29 56 Q30 86 50 92 Q70 86 71 56 Q66 66 50 66 Q34 66 29 56Z" fill="#eef2f5" />
      <path d="M38 62 Q44 58 50 61 Q56 58 62 62 Q56 65 50 63.5 Q44 65 38 62Z" fill="#dfe5ea" />
      <g class="mouth">
        {mood === 'worried'
          ? <path d="M45 69 Q50 66.5 55 69" stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round" />
          : <path d={mood === 'happy' ? 'M44 67 Q50 72 56 67' : 'M45 68 Q50 70.5 55 68'} stroke="#7a3b2e" stroke-width="2" fill="none" stroke-linecap="round" />}
      </g>
      <path d="M40 78 Q50 84 60 78" stroke="#d3dbe2" stroke-width="1.4" fill="none" />
    </svg>
  );
}

export function Hopper({ mood = 'calm', talking = false, size = 64 }) {
  const happy = mood === 'happy';
  const worried = mood === 'worried';
  return (
    <svg class={'avatar hopper' + (talking ? ' talking' : '')} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="#ffd66b" />
      <circle cx="50" cy="50" r="44" fill="#ffe59a" />
      {/* plume */}
      <path d="M58 10 Q76 2 84 14 Q74 12 70 20 Z" fill="#ff5c5c" />
      {/* head */}
      <path d="M30 96 Q28 74 34 62 Q20 64 16 54 Q13 44 24 37 Q32 30 40 28 L42 18 L50 26 Q74 25 80 50 Q83 72 76 96Z" fill="#c98b4f" />
      <path d="M50 26 Q72 30 77 52 Q79 70 76 96" fill="none" stroke="#7b4a24" stroke-width="7" stroke-linecap="round" />
      {/* helmet */}
      <path d="M38 30 Q46 12 66 16 Q80 22 80 40 L60 42 Q52 34 38 34Z" fill="#c8d2dc" stroke="#7f8b98" stroke-width="2" />
      <path d="M48 24 L66 22" stroke="#7f8b98" stroke-width="2" />
      {/* snout */}
      <ellipse cx="24" cy="54" rx="10" ry="8.5" fill="#e3b384" />
      <circle cx="20" cy="52" r="1.8" fill="#5a3416" />
      {/* eye */}
      <g class="blink">
        <ellipse cx="44" cy="44" rx="7" ry={happy ? 5 : 8} fill="#fff" stroke="#5a3416" stroke-width="1.5" />
        <circle cx={mood === 'sly' ? 46 : 42.5} cy={happy ? 44 : 45} r="3.8" fill="#2b1a0e" />
        <circle cx={mood === 'sly' ? 47 : 41.2} cy={happy ? 42.6 : 43.4} r="1.3" fill="#fff" />
      </g>
      <path d={worried ? 'M37 33 Q44 35 51 36' : mood === 'thinking' ? 'M37 35 Q44 31 51 34' : 'M37 35 Q44 32 51 35'} stroke="#5a3416" stroke-width="2.4" fill="none" stroke-linecap="round" />
      {/* mouth */}
      <g class="mouth">
        {worried
          ? <path d="M18 63 Q24 60 30 63" stroke="#5a3416" stroke-width="2.2" fill="none" stroke-linecap="round" />
          : happy
            ? <path d="M16 60 Q24 70 32 60 Z" fill="#7a2b2b" />
            : <path d="M17 61 Q24 66 31 61" stroke="#5a3416" stroke-width="2.2" fill="none" stroke-linecap="round" />}
      </g>
      <circle cx="34" cy="58" r="3.4" fill="#ff9f9f" opacity=".6" />
    </svg>
  );
}

export function CoachFace({ persona, ...p }) {
  return persona === 'hopper' ? <Hopper {...p} /> : <Vizier {...p} />;
}

export function OppFace({ who, size = 40 }) {
  if (!who) return null;
  if (who.emoji) return <span class="opp-face emoji" style={{ width: size, height: size, background: who.color + '33', fontSize: size * 0.6 }}>{who.emoji}</span>;
  return <span class="opp-face" style={{ width: size, height: size, background: who.color, fontSize: size * 0.38 }}>{initials(who.name)}</span>;
}
