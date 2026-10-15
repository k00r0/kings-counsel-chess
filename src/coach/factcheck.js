// The engine checks the AI's answer. Any chess move the AI mentions must be legal and must agree
// with what the engine found (its best line, the threat, or moves already played). Otherwise the
// answer is thrown away and the coach answers from the engine instead.
import { Chess } from 'chess.js';

const SAN = /\b(O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?[+#]?)\b/g;
const strip = m => m.replace(/[+#]/g, '');


/** facts: { fen, best: [SAN...], threat: { move }, moves: [SAN...], lastOpp } . Returns { ok, bad: [moves] } */
export function checkAnswer(text, facts) {
  const allowed = new Set([...(facts.best || []).slice(0, 4), facts.threat && facts.threat.move, facts.lastOpp, ...(facts.moves || [])].filter(Boolean).map(strip));
  const legal = new Set();
  try {
    const c = new Chess(facts.fen);
    for (const m of c.moves()) legal.add(strip(m));
    // the opponent's replies after the best move, so "after Nf3 he plays d5" is checkable
    if (facts.best && facts.best[0]) { c.move(facts.best[0]); for (const m of c.moves()) legal.add(strip(m)); }
  } catch (e) { /* bad fen: be strict */ }
  // only piece moves, captures, castling and promotions count as "moves"; plain squares like "e4" are often just squares
  const moves = [...String(text).matchAll(SAN)].map(m => strip(m[1])).filter(m => /^[KQRBN]|x|O-O|=/.test(m));
  const bad = moves.filter(m => !allowed.has(m));
  return { ok: bad.length === 0, bad };
}
