// The coach's long memory: what went wrong in which game, so he can say
// "remember last game?" and notice patterns. Lives inside the saved app state.

export const freshMemory = () => ({
  usage: {},          // phrase rotation (see voice.js)
  themes: {},         // theme -> { count, games: [gameNo...], last: { game, piece, sq, move, san } }
  games: [],          // compact game records (newest last), capped
  reports: [],        // advisor reports, every 10 games
  told: {},           // one-off tips already given: { opening_castle: gameNo, ... }
});

export const MAX_GAMES = 120;

export function recordMistake(mem, gameNo, theme, info) {
  const t = mem.themes[theme] || (mem.themes[theme] = { count: 0, games: [], last: null });
  t.count++;
  if (t.games[t.games.length - 1] !== gameNo) t.games.push(gameNo);
  if (t.games.length > 30) t.games.shift();
  t.last = { game: gameNo, ...info };
}

/** How long ago (in games) a theme last happened before this game, or null. */
export function lastSeen(mem, theme, gameNo) {
  const t = mem.themes[theme];
  if (!t) return null;
  const prev = t.games.filter(g => g < gameNo);
  if (!prev.length) return null;
  const g = prev[prev.length - 1];
  const recent = prev.filter(x => x >= gameNo - 5).length;
  return { ago: gameNo - g, recent, last: t.last && t.last.game < gameNo ? t.last : null };
}

export function whenText(ago, kids) {
  if (ago <= 1) return 'last game';
  if (ago === 2) return kids ? 'two games ago' : 'two games ago';
  if (ago <= 5) return 'a few games ago';
  return 'a while back';
}

/** What to bring up at the start of a game: the most pressing recent weakness. */
export function openingReminder(mem, gameNo) {
  const recentGames = mem.games.filter(g => g.mode !== 'lesson').slice(-5);
  if (!recentGames.length) return null;
  const counts = {};
  for (const g of recentGames) for (const th of new Set((g.mistakes || []).map(m => m.theme))) counts[th] = (counts[th] || 0) + 1;
  const last = recentGames[recentGames.length - 1];
  const lastThemes = (last.mistakes || []).map(m => m.theme);
  // a pattern across games beats a one-off
  const pattern = Object.entries(counts).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])[0];
  if (pattern) return { kind: 'pattern', theme: pattern[0], count: pattern[1] };
  if (lastThemes.length) {
    const freq = {};
    for (const t of lastThemes) freq[t] = (freq[t] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return { kind: 'last', theme: top };
  }
  // improvement: a theme that used to be common and hasn't happened in the last 4 games
  const older = mem.games.slice(-12, -4);
  const oldCounts = {};
  for (const g of older) for (const th of new Set((g.mistakes || []).map(m => m.theme))) oldCounts[th] = (oldCounts[th] || 0) + 1;
  const fixed = Object.entries(oldCounts).filter(([th, n]) => n >= 3 && !counts[th]).sort((a, b) => b[1] - a[1])[0];
  if (fixed && recentGames.length >= 4) return { kind: 'improving', theme: fixed[0] };
  return null;
}

export function addGame(mem, record) {
  mem.games.push(record);
  if (mem.games.length > MAX_GAMES) mem.games.splice(0, mem.games.length - MAX_GAMES);
}
