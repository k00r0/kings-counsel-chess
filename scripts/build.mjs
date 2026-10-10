// Builds the app into www/ (shipped inside the iOS and Android apps, and deployed as the website).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (...p) => path.join(root, ...p);
const dev = process.argv.includes('--dev');
const cfg = JSON.parse(fs.readFileSync(r('app.config.json'), 'utf8'));
delete cfg._readme;

const out = r('www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// 1. Stockfish (runs in a worker, fully offline)
fs.mkdirSync(path.join(out, 'engine'));
for (const f of ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'])
  fs.copyFileSync(r('node_modules/stockfish/bin', f), path.join(out, 'engine', f));
fs.copyFileSync(r('node_modules/stockfish/Copying.txt'), path.join(out, 'engine', 'COPYING.txt'));

// 2. Fonts
const fontsOut = path.join(out, 'fonts');
fs.mkdirSync(fontsOut);
const fonts = [['Fraunces', 'fraunces', [500, 600, 700, 800]], ['Inter', 'inter', [400, 500, 600, 700, 800]], ['Fredoka', 'fredoka', [400, 500, 600, 700]]];
let fontCss = '';
for (const [family, pkg, weights] of fonts) for (const w of weights) {
  const file = `${pkg}-latin-${w}-normal.woff2`;
  fs.copyFileSync(r('node_modules/@fontsource', pkg, 'files', file), path.join(fontsOut, file));
  fontCss += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(${file}) format("woff2")}\n`;
}
fs.writeFileSync(path.join(fontsOut, 'fonts.css'), fontCss);

// 3. Lessons and puzzles
const { buildContent } = await import('./content.mjs');
const content = buildContent();
fs.mkdirSync(path.join(out, 'content'));
fs.writeFileSync(path.join(out, 'content', 'lessons.json'), JSON.stringify(content.lessons));
fs.writeFileSync(path.join(out, 'content', 'puzzles.json'), JSON.stringify(content.puzzles));

// 4. Static files and art
for (const f of fs.readdirSync(r('src/static'))) fs.cpSync(r('src/static', f), path.join(out, f), { recursive: true });
if (fs.existsSync(r('assets/icon.png'))) fs.copyFileSync(r('assets/icon.png'), path.join(out, 'icon.png'));

// 5. JavaScript
await build({
  entryPoints: [r('src/main.jsx')], outfile: path.join(out, 'app.js'), bundle: true, format: 'esm', minify: !dev,
  target: ['safari15', 'chrome90'], jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'warning', sourcemap: dev ? 'inline' : false,
  define: { __APP_CONFIG__: JSON.stringify(cfg) },
});

const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`Built www/ (${(size(out) / 1e6).toFixed(1)} MB): ${content.stats.lessons} lessons, ${content.stats.steps} steps, ${content.puzzles.length} puzzles`);
