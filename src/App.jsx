// App shell: tabs, screens, sheets.
import { useEffect } from 'preact/hooks';
import { useNav, tab, closeSheet, back } from './ui/nav.js';
import { useStore, S } from './store.js';
import { native } from './native.js';
import { syncAds, startAds } from './services/pro.js';
import { Onboarding } from './screens/Onboarding.jsx';
import { Home, Setup } from './screens/Home.jsx';
import { Game } from './screens/Game.jsx';
import { Result } from './screens/Result.jsx';
import { Journal, Review, Report } from './screens/Journal.jsx';
import { Learn, Lesson } from './screens/Learn.jsx';
import { Drills } from './screens/Drills.jsx';
import { Puzzles } from './screens/Puzzles.jsx';
import { Me, Paywall, More } from './screens/Me.jsx';

const TABS = [['home', 'Play', '♞'], ['learn', 'Learn', '📜'], ['journal', 'Journal', '📖'], ['me', 'Me', '⚙']];

export function App() {
  const nav = useNav();
  useStore();
  const { name, params } = nav.route;
  useEffect(() => { syncAds(name, !!nav.sheet); }, [name, nav.sheet, S.pro.active, S.onboarded]);
  useEffect(() => { if (S.onboarded) startAds(); }, [S.onboarded]);

  if (!S.onboarded) return <Onboarding />;

  let screen, full = true;
  switch (name) {
    case 'setup': screen = <Setup key={params.mode} mode={params.mode} />; break;
    case 'game': screen = <Game setup={params.setup} />; break;
    case 'result': screen = <Result res={params.res} />; break;
    case 'review': screen = <Review n={params.n} key={params.n} />; break;
    case 'report': screen = <Report n={params.n} key={params.n} />; break;
    case 'lesson': screen = <Lesson id={params.id} key={params.id} />; break;
    case 'drills': screen = <Drills theme={params.theme} key={params.theme || 'all'} />; break;
    case 'puzzles': screen = <Puzzles theme={params.theme} />; break;
    case 'learn': screen = <Learn />; full = false; break;
    case 'journal': screen = <Journal />; full = false; break;
    case 'me': screen = <Me />; full = false; break;
    default: screen = <Home />; full = false;
  }
  const sheet = nav.sheet && (
    <div class="sheet-bg" onClick={closeSheet}><div class="sheet" onClick={e => e.stopPropagation()}>
      {nav.sheet.type === 'paywall' && <Paywall reason={nav.sheet.reason} />}
      {nav.sheet.type === 'more' && <More what={nav.sheet.what} />}
    </div></div>
  );
  if (full) return <div class="shell full">{screen}{sheet}</div>;
  return (
    <div class="shell">
      <main class="content">{screen}</main>
      <nav class="tabbar">
        {TABS.map(([id, label, icon]) => (
          <button key={id} class={name === id || (id === 'home' && name === 'home') ? 'on' : ''} onClick={() => tab(id)}>
            <span class="tico">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      {sheet}
    </div>
  );
}

// Android back button
native.shell.onBack(() => { if (document.querySelector('.sheet-bg')) closeSheet(); else back(); });
