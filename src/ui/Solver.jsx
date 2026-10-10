// Solve a position: puzzles, drills from your own mistakes, and lesson exercises.
// A move is right if it's the solution, or (when allowed) the engine says it's just as good.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { S } from '../store.js';
import { engine } from '../services/engine.js';
import { pov } from '../chess/analysis.js';
import { isMateScore, mateIn } from '../chess/engine.js';
import { uciToMove, NAME } from '../chess/core.js';
import { playMoveSound, sound } from '../services/sound.js';

const toUci = m => m.from + m.to + (m.promotion || '');

/**
 * props: fen, solution [uci], goal 'best'|'mate'|'check'|'capture'|'safe'|'any', onDone({ ok, firstTry }),
 *        say(text, mood) for coach lines, kids, alternatives (accept engine-equal moves), key
 */
export function Solver({ fen, solution = [], goal = 'best', onDone, say, kids, alternatives = true, hint }) {
  const [pos, setPos] = useState(fen);
  const [idx, setIdx] = useState(0);              // index into solution
  const [last, setLast] = useState(null);
  const [arrows, setArrows] = useState([]);
  const [marks, setMarks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState('play');     // play | wrong | done
  const [shake, setShake] = useState(false);
  const fails = useRef(0);
  const hints = useRef(0);
  const me = fen.split(' ')[1];

  useEffect(() => { setPos(fen); setIdx(0); setLast(null); setArrows([]); setMarks([]); setState('play'); fails.current = 0; hints.current = 0; }, [fen]);

  async function judge(before, mv, after) {
    const uci = toUci(mv);
    const expected = solution[idx];
    if (goal === 'any') return true;
    if (goal === 'check') return after.inCheck() || after.isCheckmate();
    if (goal === 'castle') return mv.flags.includes('k') || mv.flags.includes('q');
    if (expected && uci === expected) return true;
    if (goal === 'mate' && after.isCheckmate()) return true;
    if (goal === 'capture' && expected && mv.captured && mv.to === expected.slice(2, 4)) return true;
    if (!alternatives && goal !== 'safe') return false;
    // ask the engine: is this move as good as the solution?
    setBusy(true);
    try {
      const eng = engine();
      const [b, a] = await Promise.all([
        eng.analyze(before, { depth: 12 }),
        after.isGameOver() ? Promise.resolve({ lines: [] }) : eng.analyze(after.fen(), { depth: 12 }),
      ]);
      const best = b.lines[0] ? pov(b.lines[0].cp, me) : 0;
      const got = after.isCheckmate() ? 99999 : a.lines[0] ? pov(a.lines[0].cp, me) : 0;
      if (goal === 'safe') return got >= best - 120;
      if (goal === 'good') return got >= best - 50;
      if (goal === 'mate') return isMateScore(got) && got > 0 && mateIn(got) <= Math.ceil((solution.length - idx) / 2);
      if (isMateScore(best)) return isMateScore(got) && got > 0;
      return got >= best - 60 && got >= 150;
    } finally { setBusy(false); }
  }

  async function onMove(m) {
    if (state !== 'play' || busy) return;
    const c = new Chess(pos);
    let mv;
    try { mv = c.move(m); } catch (e) { return; }
    if (!mv) return;
    setPos(c.fen()); setLast([mv.from, mv.to]); setArrows([]); setMarks([]);
    playMoveSound(mv, c.inCheck());
    const ok = await judge(pos, mv, c);
    if (!ok) {
      fails.current++;
      setState('wrong'); setShake(true); sound.bad();
      setTimeout(() => setShake(false), 500);
      say && say(kids ? pick(['Oops! Try again!', 'Not that one. Look again!', 'Hmm, try a different move!']) : pick(['Not quite. Try again.', "That's not it. Look again.", 'Close, but no. Have another look.']), 'thinking');
      setTimeout(() => { setPos(pos); setLast(null); setState('play'); }, 900);
      return;
    }
    // correct: is there more to the solution?
    const rest = solution.slice(idx + 1);
    const followsSolution = toUci(mv) === solution[idx];
    if (followsSolution && rest.length >= 2 && !c.isGameOver()) {
      sound.ok();
      say && say(kids ? pick(['Yes! Keep going!', 'Great! What next?']) : pick(['Good. Keep going.', 'Yes. And now?', 'Right. Finish it.']), 'happy');
      setBusy(true);
      setTimeout(() => {
        const r = c.move(uciToMove(rest[0]));
        setPos(c.fen()); setLast([r.from, r.to]); playMoveSound(r, c.inCheck());
        setIdx(idx + 2); setBusy(false);
      }, 650);
      return;
    }
    setState('done'); sound.ok();
    onDone && onDone({ ok: true, firstTry: fails.current === 0 && hints.current === 0, fails: fails.current, hints: hints.current });
  }

  function showHint() {
    hints.current++;
    const u = solution[idx];
    if (!u) return;
    const c = new Chess(pos);
    const p = c.get(u.slice(0, 2));
    if (hints.current === 1 && p) { setMarks([{ sq: u.slice(0, 2), kind: 'hint' }]); say && say(kids ? `Try moving your ${NAME[p.type]}!` : hint || `Look at your ${NAME[p.type]}.`, 'thinking'); }
    else { setArrows([{ uci: u, color: 'good' }]); say && say(kids ? 'Follow the green arrow!' : 'Here it is.', 'happy'); }
  }

  function giveUp() {
    const u = solution[idx];
    if (u) setArrows([{ uci: u, color: 'good' }]);
    setState('done');
    onDone && onDone({ ok: false, firstTry: false, fails: fails.current, hints: hints.current, gaveUp: true });
  }

  return (
    <div class={'solver' + (shake ? ' shake' : '')}>
      <div class="board-wrap">
        <Board fen={pos} flip={me === 'b'} interactive={state === 'play' && !busy} movable={me} onMove={onMove} lastMove={last}
          arrows={arrows} marks={marks} set={S.settings.pieces} theme={S.settings.board} coords={S.settings.coords} kids={kids} check={new Chess(pos).inCheck()} />
      </div>
      <div class="solver-bar">
        <span class={'turn ' + me}>{kids ? (me === 'w' ? 'White to move' : 'Black to move') : `${me === 'w' ? 'White' : 'Black'} to move`}</span>
        {state !== 'done' && <button class="btn soft small" onClick={showHint}>Hint</button>}
        {state !== 'done' && fails.current >= 2 && <button class="link" onClick={giveUp}>Show me</button>}
        {busy && <span class="checking">checking…</span>}
      </div>
    </div>
  );
}

const pick = a => a[Math.floor(Math.random() * a.length)];
