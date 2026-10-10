// Node transport for the Stockfish WASM engine (tests and content validation).
import { createRequire } from 'module';
import { UciEngine } from '../src/chess/engine.js';
const require = createRequire(import.meta.url);
const init = require('stockfish');
export async function nodeEngine() {
  const sf = await init('lite-single');
  let handler = () => {};
  sf.listener = line => handler(line);
  return new UciEngine({ post: cmd => sf.sendCommand(cmd), onLine: fn => { handler = fn; } });
}
