// A small, static board for showing a position (with an optional arrow for the best move).
import { Board } from './Board.jsx';
import { S } from '../store.js';

export function MiniBoard({ fen, arrow, arrows, flip }) {
  const side = fen.split(' ')[1];
  return (
    <div class="mini-board">
      <Board fen={fen} flip={flip ?? side === 'b'} interactive={false} arrows={arrows || (arrow ? [{ uci: arrow, color: 'good' }] : [])}
        set={S.settings.pieces} theme={S.settings.board} coords={false} />
    </div>
  );
}
