// Board sounds, made with WebAudio (no files to ship).
import { S } from '../store.js';
import { native } from '../native.js';

let actx = null;
function ctx() {
  if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; actx = new A(); }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function knock(freq, dur, vol, noiseAmt = 0.6) {
  if (!S.settings.sound) return;
  const a = ctx(); if (!a) return;
  const t = a.currentTime;
  // a short filtered noise burst + a low body tone sounds like wood on wood
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6) * noiseAmt;
  const src = a.createBufferSource(); src.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 6; bp.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t);
  const o = a.createOscillator(), og = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  og.gain.setValueAtTime(vol * 0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(og); og.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function tone(notes, type = 'triangle', vol = 0.12) {
  if (!S.settings.sound) return;
  const a = ctx(); if (!a) return;
  notes.forEach(([f, t0, d]) => {
    const o = a.createOscillator(), g = a.createGain(); const s = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, s);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(g); g.connect(a.destination); o.start(s); o.stop(s + d + 0.05);
  });
}
export const sound = {
  unlock: () => ctx(),
  move: () => { native.haptic.tap(); knock(190, 0.09, 0.5); },
  capture: () => { native.haptic.thud(); knock(140, 0.13, 0.7, 0.9); setTimeout(() => knock(220, 0.06, 0.25), 45); },
  check: () => { knock(200, 0.09, 0.5); tone([[880, 0.03, 0.16]], 'sine', 0.06); },
  castle: () => { knock(190, 0.08, 0.45); setTimeout(() => knock(170, 0.08, 0.45), 110); },
  promote: () => tone([[523, 0, .1], [784, .08, .18]], 'triangle', 0.1),
  coach: () => tone([[660, 0, .08], [880, .06, .12]], 'sine', 0.05),
  warn: () => { native.haptic.bad(); tone([[392, 0, .12], [330, .1, .18]], 'triangle', 0.08); },
  win: () => { native.haptic.ok(); tone([[523, 0, .14], [659, .12, .14], [784, .24, .14], [1047, .38, .45]]); },
  lose: () => tone([[392, 0, .2], [330, .18, .2], [262, .36, .4]], 'sine', 0.08),
  ok: () => { native.haptic.ok(); tone([[660, 0, .1], [990, .08, .18]]); },
  bad: () => { native.haptic.bad(); tone([[300, 0, .15], [220, .12, .22]], 'sawtooth', .05); },
  tap: () => tone([[540, 0, .04]], 'sine', .05),
};
export function playMoveSound(m, check) {
  if (!m) return;
  if (check) return sound.check();
  if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) return sound.castle();
  if (m.promotion) return sound.promote();
  if (m.captured) return sound.capture();
  sound.move();
}
