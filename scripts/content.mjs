// Lessons and puzzles, as validated by tools/validate-lessons.mjs (run: npm run content).
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export function buildContent() {
  const f = n => path.join(root, 'content', n);
  if (!fs.existsSync(f('lessons.json'))) throw new Error('content/lessons.json is missing. Run: npm run content');
  const lessons = JSON.parse(fs.readFileSync(f('lessons.json'), 'utf8'));
  const puzzles = JSON.parse(fs.readFileSync(f('puzzles.json'), 'utf8'));
  let n = 0, steps = 0;
  for (const p of lessons.paths) for (const u of p.units) for (const l of u.lessons) { n++; steps += l.steps.length; }
  return { lessons, puzzles, stats: { lessons: n, steps } };
}
