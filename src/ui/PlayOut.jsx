// Play a position out against the engine: deliver mate, promote a pawn, convert, or hold a draw.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board } from './Board.jsx';
import { S } from '../store.js';
import { engine } from '../services/engine.js';
import { pov } from '../chess/analysis.js';
import { isMateScore } from '../chess/engine.js';
import { uciToMove } from '../chess/core.js';
import { playMoveSound, sound } from '../services/sound.js';

/** step: { fen, goal: 'mate'|'promote'|'win'|'hold', moves: max player moves, depth } */
export function PlayOut({ step, kids, say, onDone }) {
  const me = step.fen.split(' ')[1];
  const chess = useRef(new Chess(step.fen));
  const [fen, setFen] = useState(step.fen);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [n, setN] = useState(0);
  const [over, setOver] = useState(false);
  const fails = useRef(0);
  const limit = step.moves || 30;

  function reset(text) {
    fails.current++;
    sound.bad();
    say && say(text, 'calm');
    setTimeout(() => { chess.current = new Chess(step.fen); setFen(step.fen); setLast(null); setN(0); setBusy(false); }, 1400);
  }

  async function onMove(m) {
    if (busy || over) return;
    const c = chess.current;
    let mv; try { mv = c.move(m); } catch (e) { return; }
    if (!mv) return;
    setFen(c.fen()); setLast([mv.from, mv.to]); playMoveSound(mv, c.inCheck());
    const moves = n + 1; setN(moves);
    if (c.isCheckmate()) return win();
    if (c.isDraw() || c.isStalemate()) {
      if (step.goal === 'hold') return win();
      return reset(c.isStalemate() ? (kids ? "Oops, that's a stalemate! The king had no moves. Try again!" : 'Stalemate. Careful: always leave his king a square. Again.') : (kids ? "It's a draw! Let's try again." : 'That drifted into a draw. Try again.'));
    }
    if (step.goal === 'promote' && mv.promotion) {
      setBusy(true);
      const a = await engine().analyze(c.fen(), { depth: 10 });
      setBusy(false);
      if (a.lines[0] && pov(a.lines[0].cp, me) >= 300) return win();
      return reset(kids ? 'The new queen got captured! Try again.' : "You promoted, but he wins the new queen. Try again.");
    }
    setBusy(true);
    const a = await engine().analyze(c.fen(), { depth: step.depth || 12 });
    const ev = a.lines[0] ? pov(a.lines[0].cp, me) : 0;
    if (step.goal === 'hold' && ev < -350) return reset(kids ? "Uh-oh, that lets them win. Try again!" : 'That loses. The drawing method is precise. Try again.');
    if ((step.goal === 'mate' || step.goal === 'win') && ev < 200) return reset(kids ? "Oops! That let them escape. Try again!" : 'That throws the win away. Again.');
    if (step.goal === 'win' && (ev >= (step.target || 800))) return win();
    if (step.goal === 'hold' && moves >= limit) return win();
    if (moves >= limit) return reset(kids ? 'Out of moves! Try again, a bit faster.' : `Not done in ${limit} moves. Try a more direct plan.`);
    // engine replies
    setTimeout(() => {
      const r = c.move(uciToMove(a.best || a.lines[0].move));
      setFen(c.fen()); setLast([r.from, r.to]); playMoveSound(r, c.inCheck());
      setBusy(false);
      if (c.isCheckmate()) reset(kids ? 'Oh no, checkmate! Try again.' : 'Mated. Try again.');
      else if (c.isDraw() && step.goal !== 'hold') reset('Draw. Try again.');
    }, 500);
  }

  function win() {
    setOver(true); setBusy(false);
    onDone({ ok: true, firstTry: fails.current === 0, fails: fails.current, hints: 0 });
  }

  const goalText = { mate: kids ? 'Checkmate!' : 'Deliver mate', promote: kids ? 'Make a queen!' : 'Promote the pawn', win: 'Win material', hold: 'Hold the draw' }[step.goal];
  return (
    <div class="playout">
      <div class="board-wrap">
        <Board fen={fen} flip={me === 'b'} interactive={!busy && !over} movable={me} onMove={onMove} lastMove={last}
          set={S.settings.pieces} theme={S.settings.board} coords={S.settings.coords} kids={kids} check={new Chess(fen).inCheck()} />
      </div>
      <div class="solver-bar"><span><b>{goalText}</b></span><span>{step.goal === 'hold' ? `Move ${n}/${limit}` : `${n} / ${limit} moves`}</span>{busy && <span class="checking">thinking…</span>}</div>
    </div>
  );
}
