import { render } from 'preact';
import { App } from './App.jsx';
import { loadState, S, update } from './store.js';
import { go, tab, openSheet } from './ui/nav.js';
import { applyTheme, isDark } from './ui/theme.js';
import { native } from './native.js';
import { refreshPro } from './services/pro.js';
import { engine } from './services/engine.js';

native.ads.onHeight = h => document.documentElement.style.setProperty('--ad-h', (h || 0) + 'px');

(async function boot() {
  await loadState();
  // hooks for the automated end-to-end tests (only with ?test in the address)
  if (/[?&]test\b/.test(location.search)) window.__kc = { get S() { return S; }, go, tab, update, openSheet, engine };
  applyTheme();
  native.haptic.enable(S.settings.haptics);
  const root = document.getElementById('app');
  root.innerHTML = '';
  render(<App />, root);
  native.shell.ready(isDark());
  engine();          // warm up Stockfish in the background
  refreshPro();
})();
