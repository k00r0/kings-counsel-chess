// The talking part of the coach for typed questions and report write-ups.
// Everything the AI says is anchored to engine facts we send along, so it can't invent chess.
// If the server isn't set up, or there's no internet, callers fall back to the offline coach.
import { CFG } from '../native.js';
import { S, isKid, isPro } from '../store.js';

export const aiAvailable = () => !!CFG.ai.url && !isKid() && S.settings.ai && (typeof navigator === 'undefined' || navigator.onLine);

function device() {
  if (!S.deviceId) S.deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return S.deviceId;
}

async function post(path, body, ms = 15000) {
  const r = await fetch(CFG.ai.url.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device': device(), 'x-pro': isPro() ? '1' : '0' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error('ai ' + r.status);
  return r.json();
}

/** facts: { fen, side, moves (SAN), eval (cp, player's view), best (SAN line), threat, lastOpp, rating, weaknesses } */
export async function askCoach(question, facts, persona) {
  const res = await post('/ask', { question: String(question).slice(0, 400), facts, persona, name: S.profile.name || null });
  return res.answer;
}

export async function reportNarrative(report, persona) {
  const res = await post('/report', { report: {
    headline: report.headline, results: report.results, accuracy: report.accuracy, accuracyBefore: report.accuracyBefore,
    rating: report.rating, ratingBefore: report.ratingBefore, spots: report.spots, phase: report.phase, style: report.style,
    focus: report.focus.map(f => ({ title: f.title, habit: f.habit })), followUp: report.followUp,
  }, persona, name: S.profile.name || null }, 25000);
  return res.text;
}
