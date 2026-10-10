import { nodeEngine } from './node-engine.mjs';
const eng = await nodeEngine();
const log = [];
const orig = eng.t.post; eng.t.post = c => { log.push('> ' + c); orig(c); };
eng.listeners.add(l => { if (!l.startsWith('info') || / depth (1[5-9]|1) /.test(l)) log.push('< ' + l.slice(0, 150)); });
const seq = [['4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 18, 1], ['4k3/8/8/8/1r6/8/8/1N2K3 w - - 0 1', 16, 2]];
for (const [f, d, m] of seq) { const a = await eng.analyze(f, { depth: d, multipv: m }); console.log(f, a.lines.length, a.best); }
console.log(log.slice(-30).join('\n'));
process.exit(0);
