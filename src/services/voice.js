// The coach's voice. The device's own speech voices are used by default (offline, free).
// Pro players get a more natural "premium" voice from the AI server when it's set up, with the
// device voice as the fallback. The game clock waits while he speaks.
import { native, CFG } from '../native.js';
import { S, isPro } from '../store.js';

const STYLE = {
  vizier: { rate: 0.94, pitch: 0.82, lang: 'en-GB', prefer: [/daniel/i, /arthur/i, /oliver/i, /george/i, /male/i, /en-GB/i] },
  hopper: { rate: 1.06, pitch: 1.35, lang: 'en-US', prefer: [/samantha/i, /karen/i, /moira/i, /tessa/i, /female/i, /en-US/i] },
};
// Voices that sound good, best first. Names vary by device; anything "enhanced"/"premium"/"natural" beats the rest.
const QUALITY = [/premium/i, /enhanced/i, /natural/i, /neural/i, /siri/i, /google uk english male/i, /google us english/i];

let voices = null;
async function loadVoices() { if (!voices) voices = (await native.voice.list()).filter(v => /^en/i.test(v.lang)); return voices; }

export async function pickVoice(persona) {
  const vs = await loadVoices();
  if (!vs.length) return null;
  const st = STYLE[persona] || STYLE.vizier;
  const score = v => {
    let s = 0;
    QUALITY.forEach((r, i) => { if (r.test(v.name)) s += 40 - i * 3; });
    st.prefer.forEach((r, i) => { if (r.test(v.name) || r.test(v.lang)) s += 12 - i; });
    if (v.lang && v.lang.replace('_', '-').toLowerCase() === st.lang.toLowerCase()) s += 8;
    if (/novelty|whisper|bells|bad news|zarvox|trinoids|albert|jester|organ|bubbles|boing|cellos|hysterical|superstar|wobble|good news/i.test(v.name)) s -= 100;
    return s;
  };
  return vs.slice().sort((a, b) => score(b) - score(a))[0];
}

export async function voiceOptions() { return loadVoices(); }

let speakingId = 0;
let audio = null;
const premiumCache = new Map();

async function premium(text, persona) {
  if (!CFG.ai.url || !isPro() || !S.settings.premiumVoice || !navigator.onLine) return false;
  try {
    let url = premiumCache.get(persona + text);
    if (!url) {
      const r = await fetch(CFG.ai.url.replace(/\/$/, '') + '/tts', { method: 'POST', headers: { 'content-type': 'application/json', 'x-pro': '1' }, body: JSON.stringify({ text, persona }), signal: AbortSignal.timeout(6000) });
      if (!r.ok) return false;
      url = URL.createObjectURL(await r.blob());
      premiumCache.set(persona + text, url);
    }
    await new Promise((resolve) => {
      audio = new Audio(url);
      audio.onended = audio.onerror = resolve;
      audio.play().catch(resolve);
    });
    return true;
  } catch (e) { return false; }
}

/**
 * Speak a line. Calls onStart/onEnd so the clock can pause. Resolves when done.
 * If voice is off, it still "pauses" for a short reading time so the clock is fair.
 */
export async function speak(text, persona, { onStart, onEnd } = {}) {
  const id = ++speakingId;
  stop(true);
  onStart && onStart();
  try {
    if (!S.settings.voice) {
      await new Promise(r => setTimeout(r, Math.min(5000, 600 + text.length * 45)));
    } else if (!(await premium(text, persona))) {
      const st = STYLE[persona] || STYLE.vizier;
      let v = null;
      if (S.settings.voiceId != null && S.settings.voicePersona === persona) v = { id: S.settings.voiceId };
      else v = await pickVoice(persona);
      if (id !== speakingId) return;
      await native.voice.speak(text.replace(/\b([a-h])([1-8])\b/g, '$1 $2'), { voiceId: v ? v.id : null, rate: st.rate, pitch: st.pitch, lang: st.lang });
    }
  } finally {
    if (id === speakingId) onEnd && onEnd();
  }
}

export function stop(keepId) {
  if (!keepId) speakingId++;
  native.voice.stop();
  if (audio) { try { audio.pause(); } catch (e) { /* ignore */ } audio = null; }
}
