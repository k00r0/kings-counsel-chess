// Builds website/: landing page, privacy policy and the free web version (play/).
// Publish by pushing the folder to the kings-counsel-chess GitHub Pages repo.
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('app.config.json', 'utf8'));
fs.rmSync('website', { recursive: true, force: true });
fs.mkdirSync('website', { recursive: true });
fs.cpSync('www', 'website/play', { recursive: true });
fs.copyFileSync('assets/icon.png', 'website/icon.png');
fs.writeFileSync('website/.nojekyll', '');
const fill = s => s.replaceAll('you@example.com', cfg.supportEmail).replaceAll('https://apps.apple.com/app/idYOUR-APP-ID', cfg.appStoreUrl).replaceAll('PLAY-STORE-URL', cfg.playStoreUrl);
fs.writeFileSync('website/privacy.html', fill(fs.readFileSync('store/privacy.html', 'utf8')));
fs.writeFileSync('website/index.html', fill(fs.readFileSync('store/site.html', 'utf8')));
console.log('✔ Built website/');
