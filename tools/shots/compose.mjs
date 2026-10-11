// Turns raw captures into store screenshots with a headline. Output: store/screenshots/
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const RAW = 'store/raw', OUT = 'store/screenshots';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SIZES = { iphone: [1320, 2868], ipad: [2064, 2752], android: [1080, 2160] };
const SETS = {
  iphone: [['intervention', 'He stops your blunders', 'Take it back, see why, or play on'], ['showme', 'See exactly what you missed', 'Every warning comes from a real engine'], ['home', 'A coach who remembers', '"Last game, you left a piece unguarded too."'], ['result', 'Three things to remember', 'After every single game'], ['report', "The advisor's report", 'Your blind spots and style, every 10 games'], ['kids-game', 'Hopper coaches kids', 'Storybook pieces and gentle help for kids'], ['puzzle', '1,000 puzzles and lessons', 'From first moves to 1800'], ['kids-quest', 'Quests for beginners', 'Learn how every piece moves']],
  ipad: [['intervention', 'He stops your blunders', 'Take it back, see why, or play on'], ['report', "The advisor's report", 'Your blind spots and style, every 10 games'], ['result', 'Three things to remember', 'After every single game'], ['kids-game', 'Hopper coaches kids', 'Storybook pieces and gentle help for kids'], ['lessons', 'Lessons for every level', 'Squire, Knight and Master paths'], ['home', 'A coach who remembers', 'Built around your own games']],
};
SETS.android = SETS.iphone;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const fontCss = fs.readFileSync('www/fonts/fonts.css', 'utf8').replace(/url\(([^)]+)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync('www/fonts/' + f).toString('base64')})`);
for (const [dev, list] of Object.entries(SETS)) {
  const [W, H] = SIZES[dev];
  const p = await b.newPage({ viewport: { width: W, height: H } });
  for (const [i, [name, title, sub]] of list.entries()) {
    const kids = name.startsWith('kids');
    const img = 'data:image/png;base64,' + fs.readFileSync(`${RAW}/${dev}-${name}.png`).toString('base64');
    const pad = Math.round(W * 0.07), top = Math.round(H * 0.16);
    const shotH = H - top - Math.round(H * 0.035), shotW = Math.round(shotH * W / H);
    const bg = kids ? 'linear-gradient(160deg,#ffd93d 0%,#ffb84d 45%,#7a5cff 140%)' : 'linear-gradient(160deg,#1b3150 0%,#14243b 55%,#1f6f6b 140%)';
    const ink = kids ? '#2b2a4c' : '#fff8e6', accent = kids ? '#3a2a8c' : '#f3d27a';
    await p.setContent(`<style>${fontCss}*{margin:0}body{width:${W}px;height:${H}px;background:${bg};font-family:${kids ? 'Fredoka' : 'Fraunces'},serif;overflow:hidden;position:relative}
      h1{position:absolute;top:${Math.round(H * .035)}px;left:${pad}px;right:${pad}px;text-align:center;color:${ink};font-size:${Math.round(W * .068)}px;line-height:1.08;font-weight:700}
      p{position:absolute;top:${Math.round(H * .035 + W * .17)}px;left:${pad}px;right:${pad}px;text-align:center;color:${accent};font-family:${kids ? 'Fredoka' : 'Inter'},sans-serif;font-size:${Math.round(W * .036)}px;font-weight:600}
      img{position:absolute;top:${top}px;left:${Math.round((W - shotW) / 2)}px;width:${shotW}px;height:${shotH}px;border-radius:${Math.round(W * .04)}px;box-shadow:0 ${Math.round(W * .02)}px ${Math.round(W * .06)}px rgba(0,0,0,.35);border:${Math.round(W * .008)}px solid rgba(255,255,255,.85)}</style>
      <h1>${title}</h1><p>${sub}</p><img src="${img}">`);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${dev}-${i + 1}-${name}.png` });
  }
  await p.close();
}
// Google Play feature graphic (1024 x 500) and icon (512 x 512)
const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
const icon = 'data:image/png;base64,' + fs.readFileSync('assets/icon.png').toString('base64');
const viz = 'data:image/png;base64,' + fs.readFileSync(`${RAW}/iphone-intervention.png`).toString('base64');
await p.setContent(`<style>${fontCss}*{margin:0}body{width:1024px;height:500px;background:linear-gradient(135deg,#1b3150,#14243b 60%,#1f6f6b);overflow:hidden;position:relative;font-family:Fraunces,serif}
 .ic{position:absolute;left:60px;top:70px;width:120px;height:120px;border-radius:28px}
 h1{position:absolute;left:60px;top:215px;color:#fff8e6;font-size:58px;line-height:1.02}h1 span{color:#f3d27a}
 p{position:absolute;left:62px;top:360px;width:520px;color:#e9e2cf;font:500 24px Inter,sans-serif}
 .ph{position:absolute;right:50px;top:40px;width:300px;border-radius:24px;box-shadow:0 20px 50px rgba(0,0,0,.4);transform:rotate(4deg)}</style>
 <img class="ic" src="${icon}"><h1>King's Counsel<br><span>Chess</span></h1><p>A wise coach at your side for every move.</p><img class="ph" src="${viz}">`);
await p.screenshot({ path: `${OUT}/play-feature-graphic.png` });
await p.setViewportSize({ width: 512, height: 512 });
await p.setContent(`<body style="margin:0"><img src="${icon}" width="512" height="512">`);
await p.screenshot({ path: `${OUT}/play-icon-512.png` });
await b.close();
console.log(fs.readdirSync(OUT).join('\n'));
