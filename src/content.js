// Lessons and puzzles ship with the app as JSON (built by tools/build-content.mjs) and are loaded on demand.
let lessons = null, puzzles = null;

export async function loadLessons() {
  if (!lessons) lessons = await fetch('content/lessons.json').then(r => r.json());
  return lessons;
}
export async function loadPuzzles() {
  if (!puzzles) puzzles = await fetch('content/puzzles.json').then(r => r.json());
  return puzzles;
}
