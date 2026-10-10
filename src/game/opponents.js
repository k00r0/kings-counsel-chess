// Who sits across the board. The engine strength adapts to the player; the character
// gives the game a face. Kids meet animal friends, everyone else meets the court.

export const COURT = [
  { id: 'tobin', name: 'Squire Tobin', elo: 400, color: '#8a9a5b', blurb: 'Learned the rules last week. Very keen.' },
  { id: 'marta', name: 'Marta the Miller', elo: 600, color: '#b5835a', blurb: 'Plays on market days. Loves to grab pawns.' },
  { id: 'anselm', name: 'Brother Anselm', elo: 800, color: '#6b7f99', blurb: 'Patient, careful, a little slow in the opening.' },
  { id: 'rowena', name: 'Lady Rowena', elo: 1000, color: '#9b5d7a', blurb: 'Sharp with her knights. Watch for forks.' },
  { id: 'ivo', name: 'Captain Ivo', elo: 1200, color: '#a0522d', blurb: 'Attacks the king at the first chance.' },
  { id: 'elsbeth', name: 'Duchess Elsbeth', elo: 1400, color: '#4f6d5a', blurb: 'Solid. Rarely leaves anything loose.' },
  { id: 'grey', name: 'The Grey Bishop', elo: 1600, color: '#7a7a85', blurb: 'Loves long diagonals and quiet pressure.' },
  { id: 'castellan', name: 'Lord Castellan', elo: 1800, color: '#3d4f7a', blurb: 'Grinds out endgames for fun.' },
  { id: 'varga', name: 'Countess Varga', elo: 2000, color: '#5a2d3d', blurb: 'The strongest player at court.' },
];

export const FRIENDS = [
  { id: 'tilly', name: 'Tilly the Turtle', emoji: '🐢', elo: 150, color: '#5aa469', blurb: 'Slow and friendly.' },
  { id: 'bun', name: 'Bun the Bunny', emoji: '🐰', elo: 250, color: '#e8a0b4', blurb: 'Hops all over the board.' },
  { id: 'fenn', name: 'Fenn the Fox', emoji: '🦊', elo: 400, color: '#e07a3f', blurb: 'A little bit sneaky.' },
  { id: 'olive', name: 'Olive the Owl', emoji: '🦉', elo: 550, color: '#8d6e63', blurb: 'Thinks hard before moving.' },
  { id: 'bramble', name: 'Bramble the Bear', emoji: '🐻', elo: 700, color: '#795548', blurb: 'Big and strong.' },
  { id: 'ember', name: 'Ember the Dragon', emoji: '🐉', elo: 900, color: '#c0392b', blurb: 'The champion of the forest!' },
];

export function rosterFor(kids) { return kids ? FRIENDS : COURT; }

/** The character closest to a target strength. */
export function characterFor(kids, elo) {
  const list = rosterFor(kids);
  return list.reduce((best, c) => (Math.abs(c.elo - elo) < Math.abs(best.elo - elo) ? c : best), list[0]);
}

export const initials = name => name.replace(/^(the|lady|lord|brother|captain|duchess|countess|squire)\s+/i, '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
