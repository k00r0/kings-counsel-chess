// King's Counsel Chess, AI helper (Cloudflare Worker).
//   POST /ask     a typed question during a game, answered in the coach's voice, grounded in engine facts
//   POST /report  a short write-up of the 10-game advisor's report
//   POST /tts     premium voice (Pro), via Workers AI
// The app works fully without this; it's only for typed questions, report prose and the premium voice.

const PERSONA = {
  vizier: `You are the Vizier, an old, warm, dry-witted royal advisor who coaches chess. Speak like a wise human coach: short sentences, contractions, a little wry, never a lecture. Call the opponent "he".`,
  hopper: `You are Hopper, a cheerful little knight who coaches young children. Use very simple words and short sentences. Be kind and encouraging.`,
};

const RULES = `Rules:
- You are given FACTS computed by a chess engine. Use only those facts for anything about the position. Never invent moves, threats or evaluations. If the facts don't answer the question, say so honestly and give general advice.
- Moves are in standard algebraic notation (e.g. Nf3, exd5). Mention at most one or two concrete moves.
- Answer in 1 to 3 sentences, under 60 words. Plain text, no markdown, no lists.
- Only talk about chess and learning chess. Politely steer anything else back to the game.
- Never ask for personal information.`;

// Settings, with safe defaults if a dashboard variable is missing or mistyped.
const DEFAULT_ORIGINS = 'capacitor://localhost,https://localhost,http://localhost,https://k00r0.github.io';
function config(env) {
  const raw = String(env.FALLBACK_MODEL || '');
  const fallback = (raw.match(/@cf\/[\w.\-\/]+/) || ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'])[0];
  const groqModel = /^[\w.\-\/]+$/.test(String(env.GROQ_MODEL || '').trim()) ? String(env.GROQ_MODEL).trim() : 'openai/gpt-oss-120b';
  let origins = String(env.ALLOWED_ORIGINS || '');
  // also accept "ALLOWED_ORIGINS = ..." pasted into another field
  const m = (origins || raw).match(/(capacitor:\/\/[^\s"]+)/);
  origins = m ? m[1] : origins || DEFAULT_ORIGINS;
  return { fallback, groqModel, origins: origins.split(',').map(x => x.trim()).filter(Boolean) };
}

// Backup burst limit when the Cloudflare rate-limit binding isn't set up (per worker instance).
const hits = new Map();
function localLimit(key, limit = 12, ms = 60000) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter(t => now - t < ms);
  list.push(now); hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length <= limit;
}

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

function cors(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = config(env).origins;
  return {
    'access-control-allow-origin': allowed.includes(origin) ? origin : allowed[0] || '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-device, x-pro',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function describeFacts(f = {}) {
  const lines = [];
  if (f.fen) lines.push(`Position (FEN): ${String(f.fen).slice(0, 100)}`);
  if (f.side) lines.push(`The player is ${f.side}. It is the ${f.toMove === 'player' ? "player's" : "opponent's"} turn.`);
  if (Array.isArray(f.moves) && f.moves.length) lines.push(`Recent moves: ${f.moves.slice(-16).join(' ')}`);
  if (typeof f.eval === 'number') lines.push(`Engine evaluation from the player's side: ${f.eval > 50000 ? 'forced mate for the player' : f.eval < -50000 ? 'the opponent has a forced mate' : (f.eval / 100).toFixed(1) + ' pawns'}.`);
  if (Array.isArray(f.best) && f.best.length) lines.push(`Engine's best line for the player: ${f.best.join(' ')}`);
  if (f.threat) lines.push(`The opponent threatens ${f.threat.move}${f.threat.mate ? ' (checkmate)' : f.threat.wins ? ', winning a ' + ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' }[f.threat.wins] || 'piece') : ''}.`);
  else lines.push('The opponent has no serious threat right now.');
  if (f.lastOpp) lines.push(`The opponent's last move: ${f.lastOpp}`);
  if (f.rating) lines.push(`Player's rating: about ${f.rating}.`);
  if (Array.isArray(f.weaknesses) && f.weaknesses.length) lines.push(`The player's recurring weaknesses: ${f.weaknesses.join('; ')}.`);
  return lines.join('\n');
}

async function chat(env, messages, maxTokens) {
  // 1. Groq (fast, free tier); 2. Workers AI as backup
  if (env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: config(env).groqModel, messages, temperature: 0.7, ...(/gpt-oss/.test(config(env).groqModel) ? { reasoning_effort: 'low', include_reasoning: false, max_tokens: maxTokens + 400 } : { max_tokens: maxTokens }) }),
      });
      if (r.ok) {
        const d = await r.json();
        const t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (t) return t.trim();
      }
    } catch (e) { /* fall through */ }
  }
  const out = await env.AI.run(config(env).fallback, { messages, max_tokens: maxTokens });
  return String(out.response || '').trim();
}

const clean = s => String(s || '').replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: "King's Counsel AI" }, 200, h);
    if (req.method === 'GET' && url.pathname === '/health') {
      // Says whether each part works. Never reveals the key itself.
      const c = config(env);
      const out = { version: 2, groqKeySet: !!env.GROQ_API_KEY, groqWorks: false, workersAiBound: !!env.AI, workersAiWorks: false, voiceWorks: false, rateLimiter: env.LIMITER ? 'cloudflare' : 'built-in', model: c.groqModel, fallbackModel: c.fallback, allowedOrigins: c.origins.join(',') };
      const msg = [{ role: 'user', content: 'Reply with the single word: ready' }];
      if (env.GROQ_API_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: c.groqModel, messages: msg, max_tokens: 200, ...(/gpt-oss/.test(c.groqModel) ? { reasoning_effort: 'low' } : {}) }) });
          out.groqWorks = r.ok; if (!r.ok) out.groqStatus = r.status;
        } catch (e) { out.groqError = 'unreachable'; }
      }
      if (env.AI) {
        try { const r = await env.AI.run(c.fallback, { messages: msg, max_tokens: 10 }); out.workersAiWorks = !!(r && r.response); } catch (e) { out.workersAiError = String(e.message || e).slice(0, 120); }
        try { const v = await env.AI.run('@cf/deepgram/aura-1', { text: 'Ready.', speaker: 'helios', encoding: 'mp3' }, { returnRawResponse: true }); out.voiceWorks = !!v && (!(v instanceof Response) || v.ok); } catch (e) { out.voiceError = String(e.message || e).slice(0, 120); }
      }
      return json(out, 200, h);
    }
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);

    const device = (req.headers.get('x-device') || req.headers.get('cf-connecting-ip') || 'anon').slice(0, 64);
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: device + url.pathname });
      if (!success) return json({ error: 'slow down' }, 429, h);
    } else if (!localLimit(device + url.pathname)) return json({ error: 'slow down' }, 429, h);
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400, h); }
    const persona = body.persona === 'hopper' ? 'hopper' : 'vizier';

    try {
      if (url.pathname === '/ask') {
        const q = String(body.question || '').slice(0, 400);
        if (!q.trim()) return json({ error: 'empty' }, 400, h);
        const sys = `${PERSONA[persona]}\n${RULES}${body.name ? `\nThe player's name is ${String(body.name).slice(0, 20)}.` : ''}`;
        const answer = await chat(env, [
          { role: 'system', content: sys },
          { role: 'user', content: `FACTS:\n${describeFacts(body.facts)}\n\nQUESTION: ${q}` },
        ], 300);
        return json({ answer: clean(answer).slice(0, 600) }, 200, h);
      }
      if (url.pathname === '/report') {
        const r = body.report || {};
        const sys = `${PERSONA[persona]}\nYou are writing a short personal note to a student about their last 10 games, based ONLY on the statistics given. Two short paragraphs, under 130 words total. Warm, honest and specific: name the biggest weakness, one real improvement if there is one, and what to practise next. Plain text, no lists, no markdown, no headings.`;
        const text = await chat(env, [
          { role: 'system', content: sys },
          { role: 'user', content: `Student: ${String(body.name || 'the student').slice(0, 20)}\nSTATISTICS (JSON): ${JSON.stringify(r).slice(0, 4000)}` },
        ], 400);
        return json({ text: String(text).replace(/[*#`]/g, '').trim().slice(0, 1200) }, 200, h);
      }
      if (url.pathname === '/tts') {
        if (req.headers.get('x-pro') !== '1') return json({ error: 'pro only' }, 403, h);
        const text = clean(body.text).slice(0, 500);
        if (!text) return json({ error: 'empty' }, 400, h);
        const speaker = persona === 'hopper' ? 'luna' : 'helios';
        const audio = await env.AI.run('@cf/deepgram/aura-1', { text, speaker, encoding: 'mp3' }, { returnRawResponse: true });
        const res = audio instanceof Response ? audio : new Response(audio);
        return new Response(res.body, { headers: { ...h, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' } });
      }
      return json({ error: 'not found' }, 404, h);
    } catch (e) {
      return json({ error: 'ai unavailable' }, 503, h);
    }
  },
};
