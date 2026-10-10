// End-to-end: onboarding, a coached game with a deliberate blunder, take-back, screenshots.
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5173/?test';
const shots = 'tests/shots/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
async function page(w, h, name) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 800 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  return p;
}
const p = await page(390, 844, 'phone');
await p.goto(URL);
await p.click('text=Get started');
await p.click('text=18 or older');
await p.fill('input', 'Sam');
await p.click('text=Next');
await p.click('text=I play sometimes');
await p.click('text=Next');
await p.screenshot({ path: shots + '01-meet.png' });
await p.click('text=Begin');
await p.evaluate(() => window.__kc.update(s => { s.settings.voice = false; }));
await p.waitForTimeout(500);
await p.screenshot({ path: shots + '02-home.png' });
await p.click('text=Play with the coach');
await p.waitForTimeout(300);
await p.screenshot({ path: shots + '03-setup.png' });
await p.click('.btn.primary.big');
await p.waitForSelector('.board');
await p.waitForTimeout(1500);

async function move(from, to) {
  const box = await p.locator('.game-screen .board').boundingBox();
  const s = box.width / 8;
  const at = sq => [box.x + ('abcdefgh'.indexOf(sq[0]) + .5) * s, box.y + (8 - +sq[1] + .5) * s];
  const [x1, y1] = at(from), [x2, y2] = at(to);
  await p.mouse.click(x1, y1); await p.waitForTimeout(120); await p.mouse.click(x2, y2);
}
async function waitTurn() {
  for (let i = 0; i < 100; i++) {
    const busy = await p.evaluate(() => !!document.querySelector('.player-bar .thinking') || !!document.querySelector('.choices'));
    if (!busy) return; await p.waitForTimeout(200);
  }
}
await move('e2', 'e4'); await p.waitForTimeout(800); await waitTurn(); await p.waitForTimeout(1500);
await p.screenshot({ path: shots + '04-game.png' });
await move('f1', 'a6');
await p.waitForSelector('.choices', { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(400);
await p.screenshot({ path: shots + '05-intervention.png' });
const text = await p.locator('.bubble p').innerText();
console.log('coach said:', text);
await p.click('.choice.show').catch(() => {});
await p.waitForTimeout(500);
await p.screenshot({ path: shots + '06-showme.png' });
await p.click('.choice.takeback');
await p.waitForTimeout(600);
console.log('after takeback:', await p.locator('.bubble p').innerText());
await move('g1', 'f3'); await p.waitForTimeout(800); await waitTurn(); await p.waitForTimeout(1200);
await p.screenshot({ path: shots + '07-after.png' });
await p.click('text=Ask the Vizier');
await p.click("text=What's he threatening?");
await p.waitForTimeout(800);
console.log('threat answer:', await p.locator('.bubble p').innerText());
await p.click('text=Ask the Vizier');
await p.click('text=Give me a hint');
await p.waitForTimeout(800);
console.log('hint:', await p.locator('.bubble p').innerText());
await p.screenshot({ path: shots + '08-ask.png' });

// desktop layout of the same app state
const d = await page(1280, 800, 'desktop');
await d.goto(URL);
await d.evaluate(() => { localStorage.setItem('kingscounsel.v1', JSON.stringify({ onboarded: true, profile: { name: 'Sam', age: 25, path: 'knight', persona: 'vizier' }, settings: { voice: false } })); });
await d.goto(URL);
await d.waitForTimeout(600);
await d.screenshot({ path: shots + '10-desktop-home.png' });
await d.click('text=Play with the coach'); await d.click('.btn.primary.big');
await d.waitForTimeout(2500);
await d.screenshot({ path: shots + '11-desktop-game.png' });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await b.close();
