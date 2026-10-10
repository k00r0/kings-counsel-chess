// After each game: "three things to remember". Every ten games: the advisor's report.
// Both are built only from what actually happened in the player's own games.
import { NAME } from '../chess/core.js';

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pct = x => Math.round(x * 100) + '%';
const per = (n, games) => (games ? (n / games).toFixed(1) : '0');

/** Plain description of one mistake, e.g. "Move 14, Nf3: your knight on f3 was left unguarded." */
export function describeMistake(m, kids) {
  const pc = m.piece ? NAME[m.piece] : 'piece';
  const where = m.sq ? ` on ${m.sq}` : '';
  const head = `Move ${m.moveNo}, ${m.played}: `;
  const body = {
    hang: kids ? `your ${pc} was left with no friend protecting it.` : `your ${pc}${where} was left unguarded.`,
    ignored_threat: kids ? `your ${pc} was in danger and nobody saved it.` : `your ${pc}${where} was already attacked, and stayed attacked.`,
    mate_threat: kids ? 'your king could get checkmated.' : 'this allowed a checkmate.',
    missed_mate: kids ? `you could have done checkmate with ${m.bestSan}!` : `you had checkmate with ${m.bestSan}.`,
    missed_tactic: kids ? `${m.bestSan} would have captured something!` : `${m.bestSan} won material.`,
    missed_fork: kids ? `${m.bestSan} was a double attack!` : `${m.bestSan} was a fork.`,
    bad_trade: kids ? `your ${pc} was traded for something smaller.` : `you gave up your ${pc} for less.`,
    king_safety: kids ? "a pawn left your king's wall." : 'a pawn move weakened your king.',
    opening: `${m.bestSan} would have developed faster.`,
    endgame: `${m.bestSan} was the way in the endgame.`,
    positional: `${m.bestSan} kept a better position.`,
  }[m.theme] || `${m.bestSan} was stronger.`;
  return head + body;
}

/** The post-game card. */
export function gameCard(sum, coach, memory) {
  const kids = coach.kids;
  const items = [];
  const ms = sum.mistakes.slice().sort((a, b) => (a.takenBack - b.takenBack) || ((b.kind === 'blunder') - (a.kind === 'blunder')) || (('opening' === a.theme) - ('opening' === b.theme)));

  // 1. The thing to fix
  if (ms.length) {
    const m = ms[0];
    items.push({ kind: 'fix', icon: '⚠', title: kids ? 'Watch out for this' : 'The costly moment', text: describeMistake(m, kids), tip: cap(coach.themeTip(m.theme)), fen: m.fen, best: m.best, theme: m.theme });
  } else {
    items.push({ kind: 'fix', icon: '✓', title: kids ? 'No big oopsies!' : 'No serious mistakes', text: kids ? 'You kept your pieces safe the whole game. Amazing!' : `Not one real mistake. ${sum.counts.inaccuracy ? `Just ${sum.counts.inaccuracy} small inaccurac${sum.counts.inaccuracy === 1 ? 'y' : 'ies'}.` : 'Clean game.'}` });
  }

  // 2. Something done well
  const good = [];
  for (const h of sum.highlights) {
    if (h.mate) good.push({ text: kids ? `Checkmate with ${h.san}!` : `You finished it with ${h.san}. Checkmate.`, fen: h.fen });
    else if (h.fork) good.push({ text: kids ? `Move ${h.moveNo}: ${h.san} was a double attack!` : `Move ${h.moveNo}, ${h.san}: a fork. Well spotted.`, fen: h.fen });
    else good.push({ text: kids ? `Move ${h.moveNo}: you captured a big piece with ${h.san}!` : `Move ${h.moveNo}, ${h.san}: you won material.`, fen: h.fen });
  }
  const fixed = sum.mistakes.filter(m => m.takenBack).length;
  if (fixed) good.push({ text: kids ? `You fixed ${fixed} move${fixed > 1 ? 's' : ''} after a second look!` : `${fixed} take-back${fixed > 1 ? 's' : ''}, and you found a better move each time.` });
  if (sum.castledMove && sum.castledMove <= 10) good.push({ text: kids ? 'You castled early and kept your king safe!' : `Castled by move ${sum.castledMove}. Safe king, connected rooks.` });
  if (sum.comeback) good.push({ text: kids ? 'You never gave up!' : 'You were worse and fought back. That matters.' });
  const bestPhase = Object.entries(sum.phaseAcc || {}).filter(([, v]) => v.moves >= 4).sort((a, b) => b[1].acc - a[1].acc)[0];
  if (bestPhase && bestPhase[1].acc >= 80) good.push({ text: kids ? `Your ${bestPhase[0]} moves were super!` : `Your ${bestPhase[0]} was strong: ${bestPhase[1].acc}% accuracy.` });
  if (!good.length) good.push({ text: kids ? 'You finished the whole game. Great job!' : `${sum.counts.best} of your moves were the engine's top choice.` });
  items.push({ kind: 'good', icon: '★', title: kids ? 'You did this great' : 'Keep doing this', ...good[0] });

  // 3. The next step: a pattern from memory, or a second theme, or the weakest phase
  const counts = {};
  for (const g of memory.games.slice(-5)) for (const t of new Set((g.mistakes || []).map(x => x.theme))) counts[t] = (counts[t] || 0) + 1;
  const pattern = Object.entries(counts).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  if (pattern && (!ms.length || pattern[0] !== ms[0].theme || pattern[1] >= 3)) {
    items.push({ kind: 'next', icon: '↻', title: kids ? 'Practice this' : 'A pattern', text: kids ? `${cap(coach.themeText(pattern[0]))} in ${pattern[1]} of your last games.` : `${cap(coach.themeText(pattern[0]))}: ${pattern[1]} of your last ${Math.min(5, memory.games.length)} games.`, tip: cap(coach.themeTip(pattern[0])), theme: pattern[0], drill: true });
  } else if (ms[1] && ms[1].theme !== ms[0].theme) {
    const m = ms[1];
    items.push({ kind: 'next', icon: '→', title: kids ? 'One more thing' : 'Also worth a look', text: describeMistake(m, kids), tip: cap(coach.themeTip(m.theme)), fen: m.fen, best: m.best, theme: m.theme });
  } else {
    const weak = Object.entries(sum.phaseAcc || {}).filter(([, v]) => v.moves >= 4).sort((a, b) => a[1].acc - b[1].acc)[0];
    if (weak && weak[1].acc < 85) items.push({ kind: 'next', icon: '→', title: kids ? 'Next adventure' : 'Next step', text: kids ? `Let's practise the ${weak[0]}!` : `Your ${weak[0]} was your weakest phase (${weak[1].acc}%).`, phase: weak[0] });
    else items.push({ kind: 'next', icon: '→', title: kids ? 'Next adventure' : 'Next step', text: kids ? 'Try a stronger friend next time!' : "You're ready for a slightly stronger opponent, or a Test game to update your rating." });
  }
  return { intro: coach.cardIntro(), items };
}

// ------------------------------------------------------------------ the advisor's report

const THEME_ORDER = ['hang', 'ignored_threat', 'mate_threat', 'missed_tactic', 'missed_fork', 'missed_mate', 'bad_trade', 'king_safety', 'opening', 'endgame', 'positional'];

/** Report on the last `games` (normally 10), building on the previous report. */
export function advisorReport({ games, prev, coach, rating, ratingBefore, name, number }) {
  const kids = coach.kids;
  const n = games.length;
  const res = { win: 0, loss: 0, draw: 0 };
  for (const g of games) res[g.result || 'draw'] = (res[g.result || 'draw'] || 0) + 1;
  const acc = Math.round(games.reduce((a, g) => a + (g.accuracy || 0), 0) / Math.max(1, n));

  // blind spots: mistakes per game by theme
  const themeCount = {};
  for (const g of games) for (const m of g.mistakes || []) themeCount[m.theme] = (themeCount[m.theme] || 0) + 1;
  const spots = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).map(([theme, c]) => {
    const before = prev && prev.themeRate && prev.themeRate[theme];
    const rate = c / n;
    return { theme, label: cap(coach.themeText(theme)), perGame: +rate.toFixed(1), before: before != null ? +before.toFixed(1) : null, trend: before == null ? 'new' : rate < before - 0.15 ? 'down' : rate > before + 0.15 ? 'up' : 'same' };
  });
  const themeRate = Object.fromEntries(THEME_ORDER.map(t => [t, (themeCount[t] || 0) / n]));

  // phases
  const phase = {};
  for (const ph of ['opening', 'middlegame', 'endgame']) {
    const v = games.map(g => g.phaseAcc && g.phaseAcc[ph]).filter(Boolean);
    if (v.length) phase[ph] = Math.round(v.reduce((a, x) => a + x.acc, 0) / v.length);
  }

  // style
  const moves = games.reduce((a, g) => a + (g.counts ? g.counts.moves : 0), 0) || 1;
  const caps = games.reduce((a, g) => a + (g.captures || 0), 0);
  const checks = games.reduce((a, g) => a + (g.checks || 0), 0);
  const aggression = (caps + checks) / moves;
  const castled = games.filter(g => g.castledMove);
  const avgCastle = castled.length ? Math.round(castled.reduce((a, g) => a + g.castledMove, 0) / castled.length) : null;
  const firsts = {};
  for (const g of games.filter(g => g.color === 'w')) if (g.firstMoves && g.firstMoves[0]) firsts[g.firstMoves[0]] = (firsts[g.firstMoves[0]] || 0) + 1;
  const favFirst = Object.entries(firsts).sort((a, b) => b[1] - a[1])[0];
  const takebacks = games.reduce((a, g) => a + (g.takebacks || 0), 0);
  const style = [];
  style.push(aggression > 0.32 ? (kids ? 'You love to attack and capture!' : 'You play aggressively: lots of captures and checks. Good, as long as the back door is locked.')
    : aggression < 0.2 ? (kids ? 'You play carefully and patiently.' : 'You play patiently and keep things solid. Sometimes you can be more ambitious.')
    : (kids ? 'You mix attacking and defending nicely.' : 'A balanced style: you attack when it makes sense and defend when you must.'));
  if (castled.length < n * 0.5) style.push(kids ? "Your king often stays in the middle. Let's castle more!" : `You castled in only ${castled.length} of ${n} games. Kings in the centre get into trouble.`);
  else if (avgCastle) style.push(kids ? `You usually castle around move ${avgCastle}.` : `You usually castle around move ${avgCastle}${avgCastle > 12 ? ', which is a little late' : ', nice and early'}.`);
  if (favFirst) style.push(kids ? `Your favourite first move is ${favFirst[0]}.` : `With White you like to start with ${favFirst[0]}.`);
  if (takebacks > n * 1.5) style.push(kids ? 'You use a lot of take-backs. Try to look twice before moving!' : `You leaned on take-backs (${takebacks} in ${n} games). Try to find the problem before I have to stop you.`);

  // focus areas with drills from the player's own games
  const focus = [];
  for (const s of spots.slice(0, 4)) {
    if (focus.length >= 3) break;
    const drills = [];
    for (const g of games.slice().reverse()) for (const m of g.mistakes || []) if (m.theme === s.theme && m.best && drills.length < 3) drills.push({ fen: m.fen, best: m.best, bestSan: m.bestSan, theme: m.theme, moveNo: m.moveNo, game: g.n });
    focus.push({ theme: s.theme, title: s.label, habit: cap(coach.themeTip(s.theme)), drills });
  }
  const weakPhase = Object.entries(phase).sort((a, b) => a[1] - b[1])[0];
  if (focus.length < 3 && weakPhase) focus.push({ theme: weakPhase[0], title: kids ? `Practise the ${weakPhase[0]}` : `Your ${weakPhase[0]} (${weakPhase[1]}% accuracy)`, habit: weakPhase[0] === 'endgame' ? 'Do the endgame lessons; they pay off fastest.' : weakPhase[0] === 'opening' ? 'Develop, castle, connect the rooks.' : 'Before each move, look at checks, captures and threats.', drills: [], lesson: weakPhase[0] });

  // building on the last report
  const followUp = [];
  if (prev && prev.focus) for (const f of prev.focus) {
    const was = prev.themeRate && prev.themeRate[f.theme];
    if (was == null) continue;
    const now = themeRate[f.theme] || 0;
    if (now < was - 0.15) followUp.push({ theme: f.theme, text: kids ? `${cap(coach.themeText(f.theme))}: much better than before!` : `${f.title}: down from ${was.toFixed(1)} to ${now.toFixed(1)} per game. That's real progress.`, good: true });
    else if (now > was + 0.15) followUp.push({ theme: f.theme, text: kids ? `${cap(coach.themeText(f.theme))}: still tricky. Let's keep practising!` : `${f.title}: up from ${was.toFixed(1)} to ${now.toFixed(1)} per game. Still our top job.`, good: false });
    else followUp.push({ theme: f.theme, text: kids ? `${cap(coach.themeText(f.theme))}: about the same.` : `${f.title}: about the same as last time (${now.toFixed(1)} per game).`, good: null });
  }

  const delta = rating - ratingBefore;
  const headline = kids
    ? (res.win >= n / 2 ? `What a run, ${name}! You won ${res.win} of ${n} games!` : `You played ${n} games and learned so much, ${name}!`)
    : `${n} games: ${res.win} won, ${res.loss} lost${res.draw ? `, ${res.draw} drawn` : ''}. Rating ${ratingBefore} → ${rating} (${delta >= 0 ? '+' : ''}${delta}).`;
  const verdict = kids ? null
    : spots[0] ? `Your biggest blind spot is ${coach.themeText(spots[0].theme)}, about ${spots[0].perGame} times a game. Fix that and the rating follows.`
    : 'Hardly any serious mistakes. Time to raise the bar.';

  return {
    number, date: new Date().toISOString(), games: games.map(g => g.n), headline, verdict,
    results: res, accuracy: acc, accuracyBefore: prev ? prev.accuracy : null,
    rating, ratingBefore, spots: spots.slice(0, 5), phase, style, focus, followUp, themeRate,
    narrative: null, // filled in by the AI coach when it's available (never needed)
  };
}

/** Elo update. Coached games move the rating gently; Test games count fully. */
export function updateRating(r, oppElo, score, mode, testGames) {
  const K = mode === 'test' ? (testGames < 10 ? 40 : 24) : 6;
  const exp = 1 / (1 + Math.pow(10, (oppElo - r) / 400));
  return Math.max(100, Math.round(r + K * (score - exp)));
}

export { pct, per };
