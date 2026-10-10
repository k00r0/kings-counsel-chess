// Starting and finishing games: picks the opponent, sets up the coach, and afterwards
// updates the rating, the coach's memory and the journal.
import { S, update, isPro, isKid, helpLevel } from '../store.js';
import { CFG } from '../native.js';
import { Coach } from '../coach/coach.js';
import { GameController } from './controller.js';
import { engine } from '../services/engine.js';
import { matchElo } from '../chess/opponent.js';
import { characterFor, rosterFor } from './opponents.js';
import { openingReminder, recordMistake, addGame } from '../coach/memory.js';
import { gameCard, advisorReport, updateRating } from '../coach/report.js';

export const TIME_CONTROLS = [
  { id: 'untimed', label: 'No clock', sub: 'Coached, take your time', tc: null },
  { id: '10', label: '10 min', sub: 'Rapid', tc: { base: 600000, inc: 0 } },
  { id: '15+10', label: '15 | 10', sub: '+10 sec a move', tc: { base: 900000, inc: 10000 } },
  { id: '30', label: '30 min', sub: 'Classical', tc: { base: 1800000, inc: 0 } },
];

export function kidsMode() { return S.profile.path === 'squire'; }

/** The opponent strength the player should face now. */
export function suggestedElo(mode) {
  if (kidsMode()) return Math.max(100, S.rating - 150);
  return matchElo(S.rating, mode);
}
export function suggestedOpponent(mode) { return characterFor(kidsMode(), suggestedElo(mode)); }

export function takebacksFor(mode) {
  if (mode === 'test') return 0;
  if (kidsMode() || isPro()) return Infinity;
  return CFG.limits.freeTakebacks + (S.bonus.takebacks || 0);
}

export function createGame({ mode = 'coached', tcId = 'untimed', color = 'w', opponentId = null, resume = null }) {
  const kids = kidsMode();
  if (color === 'random') color = Math.random() < 0.5 ? 'w' : 'b';
  const tc = (TIME_CONTROLS.find(t => t.id === tcId) || TIME_CONTROLS[0]).tc;
  const chosen = opponentId && rosterFor(kids).find(c => c.id === opponentId);
  const opp = chosen || suggestedOpponent(mode);
  // a chosen character plays at their own strength; the suggested one adapts to the player
  const oppElo = resume ? resume.oppElo : chosen ? chosen.elo : suggestedElo(mode);
  const gameNo = S.gameNo + 1;
  const coach = new Coach({
    persona: S.profile.persona, talk: S.settings.talk, help: helpLevel(), mode,
    memory: S.memory, gameNo, name: S.profile.name || (kids ? 'friend' : 'my friend'), opp: kids ? opp.name.split(' ')[0] : opp.name,
  });
  const ctl = new GameController({
    engine: engine(), coach, playerColor: resume ? resume.color : color, mode, tc: resume ? resume.tc : tc,
    oppElo, kids, takebacks: resume ? resume.takebacks : takebacksFor(mode), depth: kids ? 11 : 12,
    moves: resume ? resume.moves : null,
  });
  if (resume && resume.clocks) ctl.state.clocks = resume.clocks;
  const last = S.memory.games[S.memory.games.length - 1];
  const intro = resume ? null : coach.start({ firstGame: S.gameNo === 0, lastResult: last && last.result, reminder: mode === 'test' ? null : openingReminder(S.memory, gameNo) });
  const meta = { mode, tcId, opp, oppElo, gameNo, color: ctl.playerColor };
  if (S.bonus.takebacks && mode === 'coached' && !isPro() && !kids) update(s => { s.bonus.takebacks = 0; });
  return { ctl, coach, meta, intro };
}

/** Save a game in progress so it survives the app closing. */
export function saveCurrent(ctl, meta) {
  if (ctl.state.status !== 'playing') return;
  S.current = { meta: { ...meta, opp: meta.opp.id }, moves: ctl.chess.history(), color: ctl.playerColor, oppElo: ctl.oppElo,
    tc: ctl.tc, clocks: ctl.state.clocks, takebacks: Number.isFinite(ctl.state.takebacks) ? ctl.state.takebacks : 999 };
  update(() => {});
}

/** Book-keeping after a game. Returns what the result screen shows. */
export function recordGame(ctl, coach, meta) {
  const sum = ctl.summary();
  const score = sum.result === 'win' ? 1 : sum.result === 'draw' ? 0.5 : 0;
  const before = S.rating;
  let after = before;
  const counts = ctl.chess.history().length >= 10 || sum.result === 'win';
  if (counts && meta.mode !== 'lesson') after = updateRating(before, meta.oppElo, score, meta.mode, S.testGames);
  let card, report = null;
  update(s => {
    s.current = null;
    s.gameNo = meta.gameNo;
    s.rating = after;
    if (meta.mode === 'test') s.testGames++;
    s.ratingHistory.push({ d: sum.date, r: after, mode: meta.mode });
    if (s.ratingHistory.length > 300) s.ratingHistory.shift();
    s.stats.games++;
    if (sum.result === 'win') { s.stats.wins++; s.stats.streak = Math.max(0, s.stats.streak) + 1; }
    else if (sum.result === 'loss') { s.stats.losses++; s.stats.streak = Math.min(0, s.stats.streak) - 1; }
    else s.stats.draws++;
    for (const m of sum.mistakes) recordMistake(s.memory, meta.gameNo, m.theme, { piece: m.piece, sq: m.sq, san: m.played });
    addGame(s.memory, { n: meta.gameNo, opp: meta.opp.id, oppName: meta.opp.name, tc: meta.tcId, ratingBefore: before, ratingAfter: after, ...sum });
    s.ads.gamesSince++;
    card = gameCard(sum, coach, s.memory);
    // the advisor's report, every 10 games
    if (meta.gameNo - (s.lastReportAt || 0) >= 10) {
      const games = s.memory.games.filter(g => g.n > (s.lastReportAt || 0)).slice(-10);
      const prev = s.memory.reports[s.memory.reports.length - 1] || null;
      report = advisorReport({ games, prev, coach, rating: after, ratingBefore: games[0] ? games[0].ratingBefore : before, name: s.profile.name || 'friend', number: s.memory.reports.length + 1 });
      s.memory.reports.push(report);
      if (s.memory.reports.length > 30) s.memory.reports.shift();
      s.lastReportAt = meta.gameNo;
    }
  });
  return { sum, card, before, after, report, meta };
}

export function gamesUntilReport() { return Math.max(0, 10 - (S.gameNo - (S.lastReportAt || 0))); }
export { isKid };
