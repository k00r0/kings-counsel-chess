// Piece artwork. Classic: the cburnett set every chess player knows.
// Storybook (for kids): chunky pieces with faces that blink, drawn here so they scale crisply.
import { CBURNETT } from './cburnett.js';

const TEAM = {
  w: { fill: '#fff4dc', shade: '#f0d9a8', line: '#6b4423', eye: '#3b2412', cheek: '#ffb3a7' },
  b: { fill: '#5b4b8a', shade: '#46386e', line: '#231a36', eye: '#fffbea', cheek: '#ff8fb1' },
};

function face(cx, cy, t, { gap = 3.2, smile = 2.6 } = {}) {
  const pupil = t === TEAM.w ? t.eye : '#231a36';
  const white = t === TEAM.w ? '#ffffff' : t.eye;
  return `<g class="eyes">
    <ellipse cx="${cx - gap}" cy="${cy}" rx="1.9" ry="2.3" fill="${white}" stroke="${t.line}" stroke-width=".6"/>
    <ellipse cx="${cx + gap}" cy="${cy}" rx="1.9" ry="2.3" fill="${white}" stroke="${t.line}" stroke-width=".6"/>
    <circle cx="${cx - gap + .3}" cy="${cy + .4}" r="1.1" fill="${pupil}"/>
    <circle cx="${cx + gap + .3}" cy="${cy + .4}" r="1.1" fill="${pupil}"/>
  </g>
  <circle cx="${cx - gap - 1.6}" cy="${cy + 2.8}" r="1.3" fill="${t.cheek}" opacity=".7"/>
  <circle cx="${cx + gap + 1.6}" cy="${cy + 2.8}" r="1.3" fill="${t.cheek}" opacity=".7"/>
  <path d="M${cx - smile} ${cy + 3.2} Q${cx} ${cy + 5.6} ${cx + smile} ${cy + 3.2}" fill="none" stroke="${t.line}" stroke-width="1" stroke-linecap="round"/>`;
}

const base = t => `<ellipse cx="22.5" cy="39.5" rx="12.5" ry="3.6" fill="${t.shade}" stroke="${t.line}" stroke-width="1.4"/>`;
const gold = '#f2c14e', goldLine = '#9a6a12';

const SHAPES = {
  p: t => `${base(t)}
    <path d="M15.5 38.5C15.5 31 18.3 27.5 22.5 27.5S29.5 31 29.5 38.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <circle cx="22.5" cy="19.5" r="8.6" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    ${face(22.5, 18.6, t, { gap: 3, smile: 2.4 })}`,
  r: t => `${base(t)}
    <rect x="13.5" y="17" width="18" height="21.5" rx="3" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <path d="M11.5 9.5h4.6v3.6h3.2V9.5h6.4v3.6h3.2V9.5h4.6v8.2h-22Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4" stroke-linejoin="round"/>
    ${face(22.5, 25, t)}`,
  b: t => `${base(t)}
    <path d="M14.5 38.5C14.5 32 17.4 29.6 22.5 29.6S30.5 32 30.5 38.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <path d="M22.5 6.5C28.6 12 30.8 16.6 30.8 20.8 30.8 25.8 27.2 29.6 22.5 29.6S14.2 25.8 14.2 20.8C14.2 16.6 16.4 12 22.5 6.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <circle cx="22.5" cy="5.4" r="2.4" fill="${t.fill}" stroke="${t.line}" stroke-width="1.2"/>
    <path d="M24.6 11.4 27.6 16.2" stroke="${t.line}" stroke-width="1.4" stroke-linecap="round"/>
    ${face(22.5, 21, t, { gap: 3, smile: 2.2 })}`,
  q: t => `${base(t)}
    <path d="M13 38.5C13 30.5 16.6 26.8 22.5 26.8S32 30.5 32 38.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <circle cx="22.5" cy="19.6" r="8.8" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <path d="M14.2 14.4 15.6 6.4 19.4 11.2 22.5 4.4 25.6 11.2 29.4 6.4 30.8 14.4Q22.5 11.8 14.2 14.4Z" fill="${gold}" stroke="${goldLine}" stroke-width="1.1" stroke-linejoin="round"/>
    <circle cx="15.6" cy="6.2" r="1.5" fill="${gold}" stroke="${goldLine}" stroke-width=".8"/>
    <circle cx="22.5" cy="4.1" r="1.6" fill="#ff6b8a" stroke="${goldLine}" stroke-width=".8"/>
    <circle cx="29.4" cy="6.2" r="1.5" fill="${gold}" stroke="${goldLine}" stroke-width=".8"/>
    ${face(22.5, 19.8, t)}`,
  k: t => `${base(t)}
    <path d="M13 38.5C13 30.5 16.6 27 22.5 27S32 30.5 32 38.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <circle cx="22.5" cy="20.2" r="8.8" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4"/>
    <path d="M14.6 15.2 15.4 9.2 19 12 22.5 8.4 26 12 29.6 9.2 30.4 15.2Q22.5 12.8 14.6 15.2Z" fill="${gold}" stroke="${goldLine}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M22.5 1.6v6M19.8 4.2h5.4" stroke="${gold}" stroke-width="2" stroke-linecap="round"/>
    <path d="M22.5 1.6v6M19.8 4.2h5.4" stroke="${goldLine}" stroke-width=".5" stroke-linecap="round"/>
    ${face(22.5, 20.4, t)}
    <path d="M19.6 26.2Q22.5 28.4 25.4 26.2" fill="none" stroke="${t.line}" stroke-width=".9" stroke-linecap="round" opacity=".55"/>`,
  n: t => `${base(t)}
    <path d="M15.5 38.5C15.2 32 16.2 27.6 18.4 23.6 14.6 23.8 9.6 22 9.2 17.6 8.9 13.6 12.4 10.6 16.6 9.4L17.6 4.8 21 8.2C27.6 8 32.6 13.4 32.4 21.2 32.2 28 30.4 33 30.4 38.5Z" fill="${t.fill}" stroke="${t.line}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M21 8.2C26.6 9 30.4 13 31.2 19.4 31.6 23 31 27 30.4 30" fill="none" stroke="${t.shade}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M21 8.2C26.6 9 30.4 13 31.2 19.4" fill="none" stroke="${t.line}" stroke-width=".6" opacity=".5"/>
    <g class="eyes"><ellipse cx="17.6" cy="14.2" rx="2.2" ry="2.6" fill="${t === TEAM.w ? '#fff' : t.eye}" stroke="${t.line}" stroke-width=".6"/>
    <circle cx="17.2" cy="14.6" r="1.3" fill="${t === TEAM.w ? t.eye : '#231a36'}"/></g>
    <circle cx="11.6" cy="17.4" r=".9" fill="${t.line}"/>
    <path d="M10.6 20.2Q12.8 21.8 15 20.4" fill="none" stroke="${t.line}" stroke-width="1" stroke-linecap="round"/>
    <circle cx="19.6" cy="18.6" r="1.3" fill="${t.cheek}" opacity=".7"/>`,
};

const cache = {};
/** Data URL for a piece image. set: 'classic' | 'kids'. code: 'wp', 'bn', ... */
export function pieceImage(set, code) {
  if (set !== 'kids') return CBURNETT[code];
  const k = 'k' + code;
  if (!cache[k]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${SHAPES[code[1]](TEAM[code[0]])}</svg>`;
    cache[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  return cache[k];
}

/** Inline SVG markup for kids pieces (so the eyes can blink with CSS). */
export function kidsPieceSvg(code) {
  return `<svg viewBox="0 0 45 45" aria-hidden="true">${SHAPES[code[1]](TEAM[code[0]])}</svg>`;
}
