import { S } from '../store.js';
import { native } from '../native.js';

const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: light)') : null;
export function isDark() { return S.settings.theme === 'dark' || (S.settings.theme === 'system' && !(mq && mq.matches)); }
export function applyTheme() {
  const dark = isDark();
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.kids = S.profile.path === 'squire' ? '1' : '0';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#121a26' : '#f6f1e7';
  native.shell.setDark(dark);
}
if (mq) mq.addEventListener('change', () => applyTheme());
