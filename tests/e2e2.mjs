import { chromium } from 'playwright-core';
const URL = 'http://localhost:5173/?test';
const shots = 'tests/shots/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push(e.message));
await p.goto(URL);
// kids onboarding
await p.click('text=Get started'); await p.click('text=Under 10'); await p.fill('input', 'Mia'); await p.click('text=Next');
await p.click("text=I'm brand new"); await p.click('text=Next');
await p.screenshot({ path: shots + '20-kids-meet.png' });
await p.click("text=Let's play!");
await p.evaluate(() => window.__kc.update(s => { s.settings.voice = false; }));
await p.waitForTimeout(400);
await p.screenshot({ path: shots + '21-kids-home.png' });
await p.click('text=Play with Hopper'); await p.waitForTimeout(300);
await p.screenshot({ path: shots + '22-kids-setup.png' });
await p.click('.btn.primary.big'); await p.waitForTimeout(2500);
await p.screenshot({ path: shots + '23-kids-game.png' });
// resign -> result
await p.click('[aria-label=Menu]'); await p.click('text=Stop this game');
await p.waitForSelector('.result', { timeout: 10000 });
await p.waitForTimeout(800);
await p.screenshot({ path: shots + '24-kids-result.png' });
await p.click('text=Home');
// a quest
await p.click('.tabbar >> text=Learn'); await p.waitForTimeout(800);
await p.screenshot({ path: shots + '25-quests.png' });
await p.click('text=The Rook'); await p.waitForTimeout(500);
await p.click('text=Next!'); await p.waitForTimeout(400);
await p.screenshot({ path: shots + '26-stars.png' });
const box = await p.locator('.stars-quest .board').boundingBox(); const s = box.width / 8;
const at = sq => [box.x + ('abcdefgh'.indexOf(sq[0]) + .5) * s, box.y + (8 - +sq[1] + .5) * s];
for (const [f, t] of [['a1', 'a6'], ['a6', 'f6'], ['f6', 'f1']]) { await p.mouse.click(...at(f)); await p.waitForTimeout(100); await p.mouse.click(...at(t)); await p.waitForTimeout(400); }
await p.waitForTimeout(500);
await p.screenshot({ path: shots + '27-stars-done.png' });
// puzzles
await p.goto(URL); await p.waitForTimeout(500);
await p.click('text=Puzzles'); await p.waitForTimeout(1500);
await p.screenshot({ path: shots + '28-puzzle.png' });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await b.close();
