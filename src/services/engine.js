// One Stockfish for the whole app, running in a Web Worker (works offline, on every device).
import { UciEngine, workerTransport } from '../chess/engine.js';

let eng = null;
export function engine() {
  if (!eng) eng = new UciEngine(workerTransport('engine/stockfish-18-lite-single.js'));
  return eng;
}
