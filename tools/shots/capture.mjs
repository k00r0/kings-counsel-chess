// Captures raw app screens at store sizes. Usage: node tools/shots/capture.mjs  (after npm run build)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { buildState } from './state.mjs';

const OUT = 'store/raw';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join('www', p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(5199);
const URL = 'http://localhost:5199/?test';
const DEVICES = {
  iphone: { width: 440, height: 956, scale: 3 },     // 1320 x 2868
  ipad: { width: 1032, height: 1376, scale: 2 },     // 2064 x 2752
  android: { width: 360, height: 720, scale: 3 },    // 1080 x 2160
};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function open(dev, kids) {
  const d = DEVICES[dev];
  const ctx = await b.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.scale, hasTouch: true });
  const p = await ctx.newPage();
  const { S, res } = buildState(kids);
  await p.goto(URL);
  await p.evaluate(s => localStorage.setItem('kingscounsel.v1', JSON.stringify(s)), S);
  await p.goto(URL); await p.waitForTimeout(700);
  return { p, res, S };
}
async function shot(p, name) { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name); }
async function move(p, from, to, flip = false) {
  const box = await p.locator('.game-screen .board').boundingBox(); const s = box.width / 8;
  const at = sq => { let x = 'abcdefgh'.indexOf(sq[0]), y = 8 - +sq[1]; if (flip) { x = 7 - x; y = 7 - y; } return [box.x + (x + .5) * s, box.y + (y + .5) * s]; };
  await p.mouse.click(...at(from)); await p.waitForTimeout(150); await p.mouse.click(...at(to));
}
const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'];

for (const dev of Object.keys(DEVICES)) {
  // grown-ups
  let { p, res } = await open(dev, false);
  await shot(p, `${dev}-home`);
  await p.evaluate(() => window.__kc.update(s => { s.current = { meta: { mode: 'coached', tcId: '15+10', opp: 'rowena', oppElo: 990, gameNo: 13, color: 'w' }, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'], color: 'w', oppElo: 990, tc: { base: 900000, inc: 10000 }, clocks: { w: 743000, b: 768000 }, takebacks: 3 }; }));
  await p.evaluate(() => window.__kc.go('game', { setup: { mode: 'coached', resume: window.__kc.S.current, opponentId: 'rowena', tcId: '15+10' } }));
  await p.waitForSelector('.game-screen .board'); await p.waitForTimeout(2500);
  await move(p, 'c4', 'a6');
  await p.waitForSelector('.choices', { timeout: 20000 }); await p.waitForTimeout(800);
  await shot(p, `${dev}-intervention`);
  await p.click('.choice.show'); await p.waitForTimeout(900);
  await shot(p, `${dev}-showme`);
  await p.click('.choice.takeback'); await p.waitForTimeout(900);
  await p.evaluate(() => window.__kc.tab('home'));
  await p.evaluate(r => window.__kc.go('result', { res: r }), res); await p.waitForTimeout(900);
  await shot(p, `${dev}-result`);
  await p.evaluate(() => window.__kc.go('report', { n: 1 })); await p.waitForTimeout(700);
  await shot(p, `${dev}-report`);
  await p.evaluate(() => window.__kc.tab('learn')); await p.waitForTimeout(900);
  await shot(p, `${dev}-lessons`);
  await p.evaluate(() => window.__kc.go('puzzles')); await p.waitForTimeout(1800);
  await shot(p, `${dev}-puzzle`);
  await p.evaluate(() => { window.__kc.tab('home'); window.__kc.openSheet({ type: 'paywall' }); }); await p.waitForTimeout(700);
  await shot(p, `${dev}-paywall`);
  await p.context().close();
  // kids
  ({ p } = await open(dev, true));
  await shot(p, `${dev}-kids-home`);
  await p.evaluate(() => window.__kc.update(s => { s.current = { meta: { mode: 'coached', tcId: 'untimed', opp: 'fenn', oppElo: 380, gameNo: 13, color: 'w' }, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'], color: 'w', oppElo: 380, tc: null, takebacks: 999 }; }));
  await p.evaluate(() => window.__kc.go('game', { setup: { mode: 'coached', resume: window.__kc.S.current, opponentId: 'fenn', tcId: 'untimed' } }));
  await p.waitForSelector('.game-screen .board'); await p.waitForTimeout(2500);
  await move(p, 'c4', 'a6');
  await p.waitForSelector('.choices', { timeout: 20000 }); await p.waitForTimeout(800);
  await shot(p, `${dev}-kids-game`);
  await p.evaluate(() => window.__kc.tab('learn')); await p.waitForTimeout(500);
  await p.evaluate(() => window.__kc.go('lesson', { id: 'sq-knight' })); await p.waitForTimeout(1200);
  await p.click('text=Next!'); await p.waitForTimeout(900);
  await shot(p, `${dev}-kids-quest`);
  await p.context().close();
}
await b.close(); server.close();
