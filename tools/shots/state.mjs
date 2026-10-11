// Builds realistic app states for store screenshots: 12 games of history, an advisor's report, a result card.
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { Coach } from '../../src/coach/coach.js';
import { freshMemory, recordMistake, addGame } from '../../src/coach/memory.js';
import { gameCard, advisorReport } from '../../src/coach/report.js';

const puzzles = JSON.parse(fs.readFileSync('content/puzzles.json', 'utf8'));
let seed = 3; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = theme => { const l = puzzles.filter(p => p.theme === theme); return l[Math.floor(rng() * l.length)]; };
const THEME_SRC = { hang: 'hanging', ignored_threat: 'defence', missed_tactic: 'combination', missed_mate: 'mate1', missed_fork: 'fork', mate_threat: 'defence' };
function mistake(theme, moveNo, takenBack = false) {
  const p = pick(THEME_SRC[theme] || 'hanging');
  const c = new Chess(p.fen);
  const ms = c.moves({ verbose: true }).filter(m => m.lan !== p.solution[0]); const other = ms[Math.floor(rng() * ms.length)];
  return { ply: moveNo * 2, moveNo, theme, kind: 'blunder', fen: p.fen, played: other.san, best: p.solution[0], bestSan: p.san[0], piece: other.piece, sq: other.to, takenBack, phase: 'middlegame' };
}
const OPPS = [['anselm', 'Brother Anselm'], ['rowena', 'Lady Rowena'], ['ivo', 'Captain Ivo'], ['rowena', 'Lady Rowena']];
export function buildState(kids = false) {
  const mem = freshMemory();
  const ratingHistory = [];
  let r = kids ? 380 : 880;
  const themes = [['hang', 'ignored_threat'], ['hang'], ['missed_tactic', 'hang'], ['ignored_threat'], ['hang', 'missed_fork'], ['missed_tactic'], ['hang'], ['ignored_threat', 'missed_mate'], [], ['missed_tactic'], ['hang'], []];
  for (let n = 1; n <= 12; n++) {
    const res = n % 3 === 0 ? 'loss' : 'win';
    const before = r; r += res === 'win' ? (n % 4 === 0 ? 24 : 9) : -6;
    const mistakes = themes[n - 1].map((t, i) => mistake(t, 9 + i * 6, i === 0 && n % 2 === 0));
    for (const m of mistakes) recordMistake(mem, n, m.theme, { piece: m.piece, sq: m.sq, san: m.played });
    const [opp, oppName] = OPPS[n % OPPS.length];
    addGame(mem, {
      n, opp, oppName, tc: n % 2 ? 'untimed' : '15+10', ratingBefore: before, ratingAfter: r,
      date: new Date(Date.UTC(2026, 9, n - 12 + 10)).toISOString(), mode: n % 5 === 0 ? 'test' : 'coached', color: n % 2 ? 'w' : 'b', oppElo: before - 100,
      result: res, reason: 'checkmate', plies: 50 + n * 3, accuracy: 72 + n, mistakes,
      counts: { best: 14 + n, good: 10, inaccuracy: 3, mistake: 1, blunder: mistakes.length, moves: 34 },
      highlights: [], phaseAcc: { opening: { moves: 10, acc: 84 }, middlegame: { moves: 18, acc: 70 + n }, endgame: { moves: 6, acc: 66 } },
      firstMoves: ['e4', 'Nf3', 'Bc4'], captures: 9, checks: 4, castledMove: n % 3 ? 7 : 13, takebacks: 1, help: 1, comeback: n === 7,
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5', startFen: new Chess().fen(),
    });
    ratingHistory.push({ d: new Date().toISOString(), r, mode: n % 5 === 0 ? 'test' : 'coached' });
  }
  const coach = new Coach({ persona: kids ? 'hopper' : 'vizier', talk: 'normal', help: 2, mode: 'coached', memory: mem, gameNo: 13, name: kids ? 'Mia' : 'Sam', opp: 'x' });
  const rep = advisorReport({ games: mem.games.slice(0, 10), prev: null, coach, rating: mem.games[9].ratingAfter, ratingBefore: 880, name: kids ? 'Mia' : 'Sam', number: 1 });
  rep.narrative = kids ? null : "Sam, ten games in and the shape of your chess is clear. You attack with real energy and you're finding the tactics more often. Your accuracy climbed every few games, and the comeback in game seven was the best thing I've seen from you.\n\nThe one habit holding you back is leaving pieces unguarded: it cost you material in most of these games. Before every move, look at each of your pieces and ask who protects it. Do the drills below; they're all from your own games.";
  mem.reports.push(rep);
  const S = {
    v: 1, onboarded: true,
    profile: { name: kids ? 'Mia' : 'Sam', age: kids ? 8 : 34, path: kids ? 'squire' : 'knight', persona: kids ? 'hopper' : 'vizier', level: 'casual', joined: '2026-09-28' },
    settings: { theme: 'light', sound: false, haptics: false, voice: false, talk: 'normal', board: kids ? 'meadow' : 'royal', pieces: kids ? 'kids' : 'classic', coords: true, ai: true },
    rating: r, startRating: kids ? 380 : 880, ratingHistory, testGames: 2,
    stats: { games: 12, wins: 8, losses: 4, draws: 0, streak: 2 }, memory: mem, gameNo: 12, lastReportAt: 10,
    lessons: { 'kn-blunder': { done: true, stars: 3 }, 'kn-defence': { done: true, stars: 2 }, 'kn-fork': { done: true, stars: 3 }, 'sq-rook': { done: true, stars: 3 }, 'sq-bishop': { done: true, stars: 3 } },
    puzzles: { rating: kids ? 520 : 1012, solved: {}, seen: {}, streak: 4, best: 9 },
  };
  // a fresh game's result card
  const sum = { ...mem.games[10], mistakes: [mistake('hang', 14), mistake('missed_tactic', 22, true)], highlights: [{ moveNo: 27, san: 'Nf6+', fork: true, fen: pick('fork').fen }], comeback: false, castledMove: 6, counts: { best: 21, good: 9, inaccuracy: 2, mistake: 0, blunder: 1, moves: 33 } };
  const card = gameCard(sum, coach, mem);
  const res = { sum: { ...sum, result: 'win', accuracy: 83 }, card, before: r - 9, after: r, report: null, meta: { mode: 'coached', opp: { id: 'rowena', name: 'Lady Rowena', elo: 1000, color: '#9b5d7a' }, oppElo: 990, gameNo: 13 } };
  return { S, res };
}
