// The chessboard. Pieces keep their identity between positions, so they glide (or, for kids, hop)
// from square to square. Tap-tap or drag to move. Arrows and highlights show what the coach means.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { pieceImage, kidsPieceSvg } from './pieces.js';

const FILES = 'abcdefgh';
const sqXY = (sq, flip) => { const x = FILES.indexOf(sq[0]), y = 8 - +sq[1]; return flip ? [7 - x, 7 - y] : [x, y]; };
const xySq = (x, y, flip) => (flip ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y));

function parseFen(fen) {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += +ch;
      else { out[FILES[f] + (8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase(); f++; }
    }
  });
  return out;
}

let nextId = 1;
/** Give pieces stable ids across positions so they can animate. */
function track(prev, map, lastMove) {
  const live = prev.filter(p => !p.gone);
  const out = [];
  const used = new Set();
  // pieces that didn't move keep their id
  const stay = new Map(live.filter(p => map[p.sq] === p.code).map(p => [p.sq, p]));
  for (const [sq, code] of Object.entries(map)) {
    const k = stay.get(sq);
    if (k) { out.push({ ...k, moved: false, fresh: false }); used.add(k.id); }
  }
  const moversFrom = live.filter(p => !used.has(p.id));
  for (const [sq, code] of Object.entries(map)) {
    if (stay.has(sq)) continue;
    // a piece arrived here: prefer the last move's origin (handles promotion), then the nearest of the same kind
    let cand = null;
    if (lastMove && lastMove[1] === sq) cand = moversFrom.find(p => p.sq === lastMove[0] && !used.has(p.id));
    if (!cand) {
      const [x, y] = sqXY(sq);
      let best = 99;
      for (const p of moversFrom) {
        if (used.has(p.id) || p.code !== code) continue;
        const [px, py] = sqXY(p.sq);
        const d = Math.abs(px - x) + Math.abs(py - y);
        if (d < best) { best = d; cand = p; }
      }
    }
    if (cand) { used.add(cand.id); out.push({ id: cand.id, code, sq, moved: true }); }
    else out.push({ id: nextId++, code, sq, moved: false, fresh: true });
  }
  // captured pieces fade out
  for (const p of live) if (!used.has(p.id)) out.push({ ...p, gone: true });
  return out;
}

export function Board({
  fen, flip = false, interactive = true, movable = 'w', onMove, lastMove, check = false,
  arrows = [], marks = [], set = 'classic', theme = 'royal', coords = true, dests: destsOverride, autoQueen = false, kids = false,
}) {
  const ref = useRef(null);
  const prevRef = useRef([]);
  const [sel, setSel] = useState(null);
  const [drag, setDrag] = useState(null);       // { sq, x, y }
  const [promo, setPromo] = useState(null);     // { from, to, color }
  const map = useMemo(() => parseFen(fen), [fen]);
  const pieces = useMemo(() => { const t = track(prevRef.current, map, lastMove); prevRef.current = t; return t; }, [fen]);
  const [, force] = useState(0);
  useEffect(() => { // drop the faded-out captured pieces after their animation
    if (!pieces.some(p => p.gone)) return;
    const t = setTimeout(() => { prevRef.current = prevRef.current.filter(p => !p.gone); force(n => n + 1); }, 320);
    return () => clearTimeout(t);
  }, [fen]);
  useEffect(() => setSel(null), [fen]);

  const dests = useMemo(() => {
    if (destsOverride) return destsOverride;
    const m = new Map();
    try {
      const c = new Chess(fen);
      if (c.turn() !== movable) return m;
      for (const mv of c.moves({ verbose: true })) { if (!m.has(mv.from)) m.set(mv.from, []); m.get(mv.from).push(mv.to); }
    } catch (e) { /* bad fen */ }
    return m;
  }, [fen, movable, destsOverride]);

  const kingSq = check ? Object.keys(map).find(s => map[s] === (fen.split(' ')[1] || 'w') + 'k') : null;

  function squareAt(clientX, clientY) {
    const r = ref.current.getBoundingClientRect();
    const x = Math.floor((clientX - r.left) / r.width * 8), y = Math.floor((clientY - r.top) / r.height * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return xySq(x, y, flip);
  }

  function tryMove(from, to) {
    if (!(dests.get(from) || []).includes(to)) return false;
    const code = map[from];
    if (code && code[1] === 'p' && (to[1] === '8' || to[1] === '1') && !destsOverride) {
      if (autoQueen) onMove({ from, to, promotion: 'q' });
      else setPromo({ from, to, color: code[0] });
      setSel(null);
      return true;
    }
    onMove({ from, to });
    setSel(null);
    return true;
  }

  function down(e) {
    if (!interactive || promo) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    if (sel && sel !== sq && tryMove(sel, sq)) return;
    if (dests.has(sq)) {
      setSel(sq);
      setDrag({ sq, x: e.clientX, y: e.clientY, started: false, sx: e.clientX, sy: e.clientY });
      try { ref.current.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
    } else setSel(null);
  }
  function moveP(e) {
    if (!drag) return;
    const started = drag.started || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, started });
  }
  function up(e) {
    if (!drag) return;
    const d = drag; setDrag(null);
    if (!d.started) return;
    const to = squareAt(e.clientX, e.clientY);
    if (to && to !== d.sq) tryMove(d.sq, to);
  }

  const targets = sel ? dests.get(sel) || [] : [];
  const pos = sq => { const [x, y] = sqXY(sq, flip); return { x, y }; };
  const markBy = {};
  for (const m of marks) markBy[m.sq] = m.kind;

  let dragStyle = null;
  if (drag && drag.started && ref.current) {
    const r = ref.current.getBoundingClientRect();
    const s = r.width / 8;
    dragStyle = { transform: `translate(${drag.x - r.left - s / 2}px, ${drag.y - r.top - s / 2}px) scale(1.15)`, transition: 'none', zIndex: 20 };
  }

  return (
    <div class={`board theme-${theme} set-${set}${kids ? ' kids' : ''}`} ref={ref}
      onPointerDown={down} onPointerMove={moveP} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <div class="squares">
        {Array.from({ length: 64 }, (_, i) => {
          const x = i % 8, y = Math.floor(i / 8);
          const sq = xySq(x, y, flip);
          const light = (x + y) % 2 === 0;
          const cls = ['sq', light ? 'light' : 'dark'];
          if (lastMove && (lastMove[0] === sq || lastMove[1] === sq)) cls.push('last');
          if (sel === sq) cls.push('sel');
          if (kingSq === sq) cls.push('check');
          if (markBy[sq]) cls.push('mark-' + markBy[sq]);
          return (
            <div class={cls.join(' ')} key={i}>
              {coords && x === 0 && <span class="coord rank">{sq[1]}</span>}
              {coords && y === 7 && <span class="coord file">{sq[0]}</span>}
              {targets.includes(sq) && <span class={map[sq] ? 'dest cap' : 'dest'} />}
              {markBy[sq] === 'star' && <span class="star">★</span>}
              {markBy[sq] === 'rock' && <span class="rock" />}
            </div>
          );
        })}
      </div>
      <div class="pieces">
        {pieces.map(p => {
          const { x, y } = pos(p.sq);
          const dragging = drag && drag.started && drag.sq === p.sq && !p.gone;
          const style = dragging ? dragStyle : { transform: `translate(${x * 100}%, ${y * 100}%)` };
          const cls = ['piece', p.code, p.gone ? 'gone' : '', p.moved ? 'moved' : '', p.fresh ? 'fresh' : '', markBy[p.sq] ? 'marked-' + markBy[p.sq] : ''].join(' ');
          return set === 'kids'
            ? <div class={cls} key={p.id} style={style}><div class="hop" key={p.sq} dangerouslySetInnerHTML={{ __html: kidsPieceSvg(p.code) }} /></div>
            : <div class={cls} key={p.id} style={{ ...style, backgroundImage: `url("${pieceImage(set, p.code)}")` }} />;
        })}
      </div>
      <Arrows arrows={arrows} flip={flip} />
      {promo && (
        <div class="promo" onPointerDown={e => e.stopPropagation()}>
          <div class="promo-box">
            {['q', 'r', 'b', 'n'].map(t => (
              <button key={t} class="promo-btn" aria-label={{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t]}
                onClick={() => { const p = promo; setPromo(null); onMove({ from: p.from, to: p.to, promotion: t }); }}>
                {set === 'kids' ? <span dangerouslySetInnerHTML={{ __html: kidsPieceSvg(promo.color + t) }} /> : <img src={pieceImage(set, promo.color + t)} alt="" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const COLORS = { good: '#2fa86b', danger: '#e0473d', hint: '#3b82f6', info: '#c58b2a' };

function Arrows({ arrows, flip }) {
  if (!arrows || !arrows.length) return null;
  const c = sq => { const [x, y] = sqXY(sq, flip); return [x + 0.5, y + 0.5]; };
  return (
    <svg class="arrows" viewBox="0 0 8 8" aria-hidden="true">
      <defs>
        {Object.entries(COLORS).map(([k, col]) => (
          <marker key={k} id={'ah-' + k} markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto" markerUnits="strokeWidth" viewBox="0 0 4 4">
            <path d="M0,0 L4,2 L0,4 Z" fill={col} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => {
        const [x1, y1] = c(a.uci.slice(0, 2)), [x2, y2] = c(a.uci.slice(2, 4));
        const len = Math.hypot(x2 - x1, y2 - y1);
        const ex = x2 - (x2 - x1) / len * 0.32, ey = y2 - (y2 - y1) / len * 0.32;
        const col = a.color || 'good';
        return <line key={i} class="arrow" x1={x1} y1={y1} x2={ex} y2={ey} stroke={COLORS[col] || col} stroke-width="0.16" stroke-linecap="round" marker-end={`url(#ah-${col})`} opacity="0.85" />;
      })}
    </svg>
  );
}
