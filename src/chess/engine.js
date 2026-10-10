// A small UCI client for Stockfish. The transport (a browser Web Worker, or the Node engine in tests)
// is plugged in, so the same analysis code runs everywhere.
//
// Scores are always returned from WHITE's point of view, in centipawns. Mates become ±(100000 - plies*100).

export const MATE = 100000;

export function scoreToCp(kind, value) {
  if (kind === 'mate') return value > 0 ? MATE - value * 100 : -MATE - value * 100;
  return value;
}
export const isMateScore = cp => Math.abs(cp) > MATE - 10000;
export const mateIn = cp => (isMateScore(cp) ? Math.ceil((MATE - Math.abs(cp)) / 100) * Math.sign(cp) : 0);

export class UciEngine {
  /** transport: { post(cmd), onLine(fn) } */
  constructor(transport) {
    this.t = transport;
    this.queue = Promise.resolve();
    this.listeners = new Set();
    this.multipv = 1;
    this.t.onLine(line => this.listeners.forEach(f => f(line)));
    this.ready = this._cmdUntil(['uci', 'setoption name Hash value 32', 'isready'], l => l === 'readyok');
  }

  _cmdUntil(cmds, done, onLine) {
    return new Promise(resolve => {
      const f = line => {
        if (onLine) onLine(line);
        if (done(line)) { this.listeners.delete(f); resolve(line); }
      };
      this.listeners.add(f);
      for (const c of cmds) this.t.post(c);
    });
  }

  /** Serialize all engine work. */
  _enqueue(job) {
    const p = this.queue.then(() => this.ready).then(job);
    this.queue = p.catch(() => {});
    return p;
  }

  newGame() { return this._enqueue(() => this._cmdUntil(['ucinewgame', 'isready'], l => l === 'readyok')); }

  /**
   * Analyse a position. Returns { lines: [{ move, cp, pv, depth }], best } with lines sorted best-first
   * for the side to move (cp is White's view).
   */
  analyze(fen, { depth = 12, multipv = 1, movetime = null, nodes = null } = {}) {
    return this._enqueue(async () => {
      const whiteToMove = fen.split(' ')[1] === 'w';
      const byRank = {};
      const cmds = [];
      if (multipv !== this.multipv) { cmds.push(`setoption name MultiPV value ${multipv}`); this.multipv = multipv; }
      cmds.push(`position fen ${fen}`);
      cmds.push(movetime ? `go movetime ${movetime}` : nodes ? `go nodes ${nodes}` : `go depth ${depth}`);
      const last = await this._cmdUntil(cmds, l => l.startsWith('bestmove'), line => {
        if (!line.startsWith('info') || !line.includes(' pv ')) return;
        const m = line.match(/ depth (\d+).*? multipv (\d+) score (cp|mate) (-?\d+).*? pv (.+)$/);
        if (!m) return;
        if (/ (upperbound|lowerbound) /.test(line)) return;
        const raw = scoreToCp(m[3], +m[4]);
        byRank[+m[2]] = { depth: +m[1], move: m[5].split(' ')[0], pv: m[5].split(' '), cp: whiteToMove ? raw : -raw };
      });
      const best = last.split(' ')[1];
      const lines = Object.keys(byRank).sort((a, b) => a - b).map(k => byRank[k]);
      if (!lines.length && best && best !== '(none)') lines.push({ depth: 0, move: best, pv: [best], cp: 0 });
      return { lines, best: best === '(none)' ? null : best };
    });
  }
}

/** Browser transport: Stockfish runs in its own Web Worker. */
export function workerTransport(url) {
  const w = new Worker(url);
  let handler = () => {};
  w.onmessage = e => handler(typeof e.data === 'string' ? e.data : String(e.data));
  return { post: cmd => w.postMessage(cmd), onLine: fn => { handler = fn; }, worker: w };
}
