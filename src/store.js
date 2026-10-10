// App state: profile, settings, rating, the coach's memory, lessons. Saved on the device after every change.
import { useEffect, useState } from 'preact/hooks';
import { native, CFG } from './native.js';
import { freshMemory } from './coach/memory.js';

const KEY = 'kingscounsel.v1';

export const fresh = () => ({
  v: 1, onboarded: false,
  profile: { name: '', age: null, path: 'knight', persona: 'vizier', level: 'casual', joined: today() },
  settings: { theme: 'system', sound: true, haptics: true, voice: true, voiceId: null, premiumVoice: true, talk: 'normal', board: 'royal', pieces: 'classic', coords: true, ai: true, flip: false },
  rating: 800, ratingHistory: [], testGames: 0, startRating: 800,
  stats: { games: 0, wins: 0, losses: 0, draws: 0, streak: 0 },
  memory: freshMemory(),
  gameNo: 0,
  lessons: {},           // id -> { done, stars }
  drills: {},            // key -> { solved, tries }
  puzzles: { rating: 800, solved: {}, seen: {}, streak: 0, best: 0 },
  current: null,         // a game in progress (resumed if the app closes)
  pro: { active: false, plan: null, checked: 0 },
  ads: { gamesSince: 0 },
  bonus: { takebacks: 0, questions: 0 },
  questions: { day: '', used: 0 },
  lastReportAt: 0,
});

export let S = fresh();
const subs = new Set();
let saveTimer = null;

export async function loadState() {
  try {
    const raw = await native.storage.get(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = fresh();
      S = { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, profile: { ...base.profile, ...saved.profile },
        stats: { ...base.stats, ...saved.stats }, memory: { ...base.memory, ...saved.memory }, puzzles: { ...base.puzzles, ...saved.puzzles },
        bonus: { ...base.bonus, ...saved.bonus }, ads: { ...base.ads, ...saved.ads } };
    }
  } catch (e) { S = fresh(); }
  return S;
}

export function save(now) {
  clearTimeout(saveTimer);
  const doit = () => native.storage.set(KEY, JSON.stringify(S));
  if (now) doit(); else saveTimer = setTimeout(doit, 200);
}

export function update(fn) { fn(S); save(); subs.forEach(f => f()); }

export function resetAll() {
  const keep = { pro: S.pro, settings: S.settings };
  S = { ...fresh(), ...keep };
  save(true);
  subs.forEach(f => f());
}

export function useStore() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(n => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return S;
}

export function today(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export const isPro = () => !!(S.pro && S.pro.active);
export const isKid = () => S.profile.age != null && S.profile.age < 13;
export const age = () => S.profile.age;
export const persona = () => S.profile.persona;
/** How much the coach spells things out: 3 = squire (kids), 2 = knight, 1 = master. */
export const helpLevel = () => (S.profile.path === 'squire' ? 3 : S.profile.path === 'master' ? 1 : 2);

/** Free-text questions to the AI coach left today. */
export function questionsLeft() {
  const t = today();
  const used = S.questions.day === t ? S.questions.used : 0;
  const cap = isPro() ? CFG.limits.proQuestionsPerDay : CFG.limits.freeQuestionsPerDay;
  return Math.max(0, cap - used) + (S.bonus.questions || 0);
}
export function useQuestion() {
  update(s => {
    const t = today();
    if (s.questions.day !== t) s.questions = { day: t, used: 0 };
    const cap = isPro() ? CFG.limits.proQuestionsPerDay : CFG.limits.freeQuestionsPerDay;
    if (s.questions.used >= cap && s.bonus.questions > 0) s.bonus.questions--;
    else s.questions.used++;
  });
}
