// Tiny router: the current screen, a back stack, and the paywall sheet.
import { useEffect, useState } from 'preact/hooks';

const subs = new Set();
export const nav = { route: { name: 'home', params: {} }, stack: [], sheet: null };
const emit = () => subs.forEach(f => f());

export function go(name, params = {}, { replace = false } = {}) {
  if (!replace) nav.stack.push(nav.route);
  nav.route = { name, params };
  emit();
  window.scrollTo(0, 0);
}
export function tab(name) { nav.stack = []; nav.route = { name, params: {} }; emit(); window.scrollTo(0, 0); }
export function back() { nav.route = nav.stack.pop() || { name: 'home', params: {} }; emit(); }
export function openSheet(sheet) { nav.sheet = sheet; emit(); }
export function closeSheet() { nav.sheet = null; emit(); }
export function useNav() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(n => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return nav;
}
