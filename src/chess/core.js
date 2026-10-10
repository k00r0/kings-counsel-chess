// Board geometry and piece facts shared by the coach, the opponent and the UI.
// Pure functions over chess.js boards, so they run in the browser and in Node tests.
import { Chess } from 'chess.js';

export const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const FILES = 'abcdefgh';

export const sqToXY = sq => [FILES.indexOf(sq[0]), +sq[1] - 1];
export const xyToSq = (x, y) => (x >= 0 && x < 8 && y >= 0 && y < 8 ? FILES[x] + (y + 1) : null);
export const other = c => (c === 'w' ? 'b' : 'w');

/** Map square -> {type, color} for every piece. */
export function pieceMap(chess) {
  const out = {};
  for (const row of chess.board()) for (const p of row) if (p) out[p.square] = { type: p.type, color: p.color };
  return out;
}

const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Squares a piece standing on `sq` attacks (regardless of whose turn it is). */
export function attacksFrom(map, sq) {
  const pc = map[sq];
  if (!pc) return [];
  const [x, y] = sqToXY(sq);
  const out = [];
  const step = (dirs, slide) => {
    for (const [dx, dy] of dirs) {
      let nx = x + dx, ny = y + dy;
      while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        const t = xyToSq(nx, ny);
        out.push(t);
        if (!slide || map[t]) break;
        nx += dx; ny += dy;
      }
    }
  };
  switch (pc.type) {
    case 'p': { const d = pc.color === 'w' ? 1 : -1; for (const dx of [-1, 1]) { const t = xyToSq(x + dx, y + d); if (t) out.push(t); } break; }
    case 'n': step(KN, false); break;
    case 'k': step(KG, false); break;
    case 'b': step(DIAG, true); break;
    case 'r': step(ORTHO, true); break;
    case 'q': step(ORTHO, true); step(DIAG, true); break;
  }
  return out;
}

/** Squares of `color` pieces that attack `target`. */
export function attackersOf(map, target, color) {
  const out = [];
  for (const [sq, pc] of Object.entries(map)) if (pc.color === color && attacksFrom(map, sq).includes(target)) out.push(sq);
  return out;
}

const minVal = (map, sqs) => Math.min(...sqs.map(s => VALUE[map[s].type]));

/**
 * Pieces of `color` that can be won: attacked and undefended, or attacked by something cheaper.
 * Returns [{sq, type, attackers, defenders, gain}] sorted by how much they'd lose.
 */
export function loosePieces(map, color) {
  const out = [];
  for (const [sq, pc] of Object.entries(map)) {
    if (pc.color !== color || pc.type === 'k') continue;
    const att = attackersOf(map, sq, other(color));
    if (!att.length) continue;
    const def = attackersOf(map, sq, color);
    const cheapest = minVal(map, att);
    let gain = 0;
    if (!def.length) gain = VALUE[pc.type];
    else if (cheapest < VALUE[pc.type]) gain = VALUE[pc.type] - cheapest;
    if (gain > 0) out.push({ sq, type: pc.type, attackers: att, defenders: def, gain });
  }
  return out.sort((a, b) => b.gain - a.gain);
}

/** Pins against `color`: their piece can't (or shouldn't) move because something bigger sits behind it. */
export function pinsAgainst(map, color) {
  const out = [];
  for (const [sq, pc] of Object.entries(map)) {
    if (pc.color === color || !'brq'.includes(pc.type)) continue;
    const dirs = pc.type === 'b' ? DIAG : pc.type === 'r' ? ORTHO : ORTHO.concat(DIAG);
    const [x, y] = sqToXY(sq);
    for (const [dx, dy] of dirs) {
      let nx = x + dx, ny = y + dy, first = null;
      while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        const t = xyToSq(nx, ny), p = map[t];
        if (p) {
          if (!first) { if (p.color !== color) break; first = t; }
          else {
            if (p.color === color && VALUE[p.type] > VALUE[map[first].type] && p.type !== 'p')
              out.push({ pinner: sq, pinned: first, behind: t, absolute: p.type === 'k' });
            break;
          }
        }
        nx += dx; ny += dy;
      }
    }
  }
  return out;
}

/** Enemy pieces the piece on `sq` attacks that are worth going after (a fork has 2+). */
export function targetsOf(map, sq) {
  const me = map[sq];
  if (!me) return [];
  const out = [];
  for (const t of attacksFrom(map, sq)) {
    const p = map[t];
    if (!p || p.color === me.color) continue;
    const defended = attackersOf(map, t, p.color).length > 0;
    if (p.type === 'k' || VALUE[p.type] > VALUE[me.type] || !defended) out.push({ sq: t, type: p.type, defended });
  }
  return out;
}

export function material(map) {
  let w = 0, b = 0;
  for (const pc of Object.values(map)) { if (pc.type === 'k') continue; if (pc.color === 'w') w += VALUE[pc.type]; else b += VALUE[pc.type]; }
  return { w, b, diff: w - b };
}

/** FEN with the other side to move (a "null move"), used to ask "what does he threaten?". Null if illegal. */
export function nullMoveFen(fen) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  const f = parts.join(' ');
  try {
    const c = new Chess(f);
    // the side that just "passed" must not be giving check (illegal position otherwise)
    const map = pieceMap(c);
    const kingSq = Object.keys(map).find(s => map[s].type === 'k' && map[s].color === other(parts[1]));
    if (kingSq && attackersOf(map, kingSq, parts[1]).length) return null;
    return f;
  } catch (e) { return null; }
}

export function phase(map) {
  let nonPawn = 0;
  for (const pc of Object.values(map)) if ('nbrq'.includes(pc.type)) nonPawn += VALUE[pc.type];
  return nonPawn > 40 ? 'opening' : nonPawn > 20 ? 'middlegame' : 'endgame';
}

export function uciToMove(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined };
}

/** SAN for a UCI move in a position, or null. */
export function sanOf(fen, uci) {
  try { const c = new Chess(fen); const m = c.move(uciToMove(uci)); return m ? m.san : null; } catch (e) { return null; }
}

/** Convert a UCI line into SAN moves. */
export function pvToSan(fen, pv, max = 6) {
  const c = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, max)) {
    try { const m = c.move(uciToMove(u)); if (!m) break; out.push(m.san); } catch (e) { break; }
  }
  return out;
}
