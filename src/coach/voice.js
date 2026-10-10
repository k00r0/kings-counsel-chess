// Turns a phrase bank into speech that doesn't repeat.
//
// Templates:  {slot} is filled from data,  [a|b|c] picks one option at random.
// Every key holds many variants. We always pick among the least-recently-used ones, and the
// usage record is saved with the player's profile, so a line isn't heard again until the
// whole set has been used, across games and sessions.

export class Voice {
  /** bank: { key: [templates] } ; usage: persisted object (mutated) ; rng: () => 0..1 */
  constructor(bank, usage, rng = Math.random) {
    this.bank = bank;
    this.usage = usage;            // { stamp: n, keys: { key: { idx: stamp } } }
    if (!this.usage.keys) this.usage.keys = {};
    if (!this.usage.stamp) this.usage.stamp = 1;
    this.rng = rng;
    this.recent = [];              // last few spoken lines, never repeated back-to-back even across keys
  }

  has(key) { return Array.isArray(this.bank[key]) && this.bank[key].length > 0; }

  /** Pick a template for key (least recently used first). */
  pick(key) {
    const list = this.bank[key];
    if (!list || !list.length) return null;
    const u = this.usage.keys[key] || (this.usage.keys[key] = {});
    let min = Infinity;
    for (let i = 0; i < list.length; i++) min = Math.min(min, u[i] || 0);
    const pool = [];
    for (let i = 0; i < list.length; i++) if ((u[i] || 0) === min) pool.push(i);
    const i = pool[Math.floor(this.rng() * pool.length)];
    u[i] = this.usage.stamp++;
    return list[i];
  }

  /** Fill a template. Unknown slots make the template unusable (returns null). */
  fill(tpl, data = {}) {
    let ok = true;
    let s = tpl.replace(/\[([^\]]+)\]/g, (_, alts) => { const a = alts.split('|'); return a[Math.floor(this.rng() * a.length)]; });
    s = s.replace(/\{(\w+)\}/g, (_, k) => {
      const v = data[k];
      if (v === undefined || v === null || v === '') { ok = false; return ''; }
      return String(v);
    });
    if (!ok) return null;
    return tidy(s);
  }

  /** Say something for `key`. Tries a few variants if some need data we don't have. */
  say(key, data = {}) {
    const list = this.bank[key];
    if (!list) return null;
    for (let tries = 0; tries < Math.min(list.length, 6); tries++) {
      const t = this.pick(key);
      const s = t && this.fill(t, data);
      if (s && !this.recent.includes(s)) { this.remember(s); return s; }
    }
    return null;
  }

  /** Join pieces: an optional opener + core, e.g. say2(['opener'], 'hang', data). */
  compose(parts, data = {}) {
    const out = [];
    for (const p of parts) {
      if (!p) continue;
      if (typeof p === 'object' && p.chance !== undefined) {
        if (this.rng() < p.chance) { const s = this.say(p.key, data); if (s) out.push(s); }
      } else if (typeof p === 'object' && p.text) out.push(p.text);
      else { const s = this.say(p, data); if (s) out.push(s); }
    }
    return out.length ? tidy(out.join(' ')) : null;
  }

  remember(s) { this.recent.push(s); if (this.recent.length > 12) this.recent.shift(); }
}

function tidy(s) {
  s = s.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
  // Capitalise the first letter of each sentence
  s = s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  return s;
}

/** "a knight" / "an" helper, and nice lists. */
export const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
export const list = arr => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);
