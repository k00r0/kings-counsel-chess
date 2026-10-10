// Renders the app icon and splash screen from SVG (run once; needs Chromium via Playwright).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const crown = (s) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${s}" height="${s}">
  <defs><radialGradient id="g" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#22406a"/><stop offset="1" stop-color="#0f1b2d"/></radialGradient>
  <linearGradient id="au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#d4a63a"/></linearGradient></defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <path d="M15 44h34l-2.6 7H17.6z" fill="#c08f26"/>
  <path d="M16.5 42 12.5 21l10 9.5 9.5-15.5 9.5 15.5 10-9.5-4 21z" fill="url(#au)" stroke="#8a5d0e" stroke-width="1.3" stroke-linejoin="round"/>
  <circle cx="12.4" cy="19.8" r="2.8" fill="#ffe08a" stroke="#8a5d0e" stroke-width="1"/>
  <circle cx="32" cy="13.4" r="3.1" fill="#e0473d" stroke="#8a5d0e" stroke-width="1"/>
  <circle cx="51.6" cy="19.8" r="2.8" fill="#ffe08a" stroke="#8a5d0e" stroke-width="1"/>
  <path d="M25 36.5h14" stroke="#8a5d0e" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await p.setContent(`<body style="margin:0">${crown(1024)}</body>`);
await p.screenshot({ path: 'assets/icon.png' });
fs.copyFileSync('assets/icon.png', 'assets/icon-only.png');
await p.setViewportSize({ width: 2732, height: 2732 });
await p.setContent(`<body style="margin:0;background:#0f1b2d;display:grid;place-items:center;height:2732px">${crown(700).replace('<rect', '<rect rx="14"')}</body>`);
await p.screenshot({ path: 'assets/splash.png' });
fs.copyFileSync('assets/splash.png', 'assets/splash-dark.png');
await b.close();
console.log('assets/icon.png, assets/splash.png');
