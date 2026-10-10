// Settings, profile, Pro, and the paywall / "more" sheets.
import { useEffect, useState } from 'preact/hooks';
import { S, update, isPro, resetAll, isKid } from '../store.js';
import { native, CFG } from '../native.js';
import { closeSheet, openSheet } from '../ui/nav.js';
import { CoachFace } from '../ui/Avatar.jsx';
import { applyTheme } from '../ui/theme.js';
import { speak, voiceOptions, pickVoice } from '../services/voice.js';
import { buyPro, refreshPro } from '../services/pro.js';
import { Board } from '../ui/Board.jsx';
import { toast } from '../ui/fx.js';

const BOARDS = [['royal', 'Royal'], ['walnut', 'Walnut'], ['slate', 'Slate'], ['meadow', 'Meadow'], ['marble', 'Marble']];

export function Me() {
  const [, set] = useState(0);
  const refresh = () => set(n => n + 1);
  const st = S.settings;
  const setS = (k, v) => { update(s => { s.settings[k] = v; }); if (k === 'theme') applyTheme(); refresh(); };
  const kid = isKid();
  const [voices, setVoices] = useState([]);
  useEffect(() => { voiceOptions().then(setVoices); }, []);
  const persona = S.profile.persona;
  return (
    <div class="page me">
      <header class="bar-top"><h2>{S.profile.name || 'Me'}</h2>{isPro() && <span class="pro-badge">PRO</span>}</header>

      <section class="card">
        <h3>Your path</h3>
        <div class="seg">
          {[['squire', 'Squire', 'Ages 5–10'], ['knight', 'Knight', 'Up to ~1200'], ['master', 'Master', '1200+']].map(([id, l, sub]) => (
            <button key={id} class={S.profile.path === id ? 'on' : ''} onClick={() => { update(s => { s.profile.path = id; if (id === 'squire') { s.profile.persona = 'hopper'; s.settings.pieces = 'kids'; } }); applyTheme(); refresh(); }}><b>{l}</b><small>{sub}</small></button>
          ))}
        </div>
        <label class="field"><span>Name</span><input value={S.profile.name} maxLength={20} onChange={e => { update(s => { s.profile.name = e.currentTarget.value.trim(); }); }} /></label>
      </section>

      <section class="card">
        <h3>Your coach</h3>
        <div class="coach-pick">
          {[['vizier', 'The Vizier'], ['hopper', 'Hopper']].map(([id, l]) => (
            <button key={id} class={'cp' + (persona === id ? ' on' : '')} onClick={() => { update(s => { s.profile.persona = id; }); refresh(); }}>
              <CoachFace persona={id} mood="happy" size={56} /><b>{l}</b>
            </button>
          ))}
        </div>
        <label class="switch"><input type="checkbox" checked={st.voice} onChange={() => setS('voice', !st.voice)} /><span>Speak out loud</span></label>
        {st.voice && voices.length > 0 && (
          <label class="field"><span>Voice</span>
            <select value={st.voicePersona === persona && st.voiceId != null ? st.voiceId : ''} onChange={e => { const v = e.currentTarget.value; update(s => { s.settings.voiceId = v === '' ? null : +v; s.settings.voicePersona = persona; }); refresh(); }}>
              <option value="">Automatic (best available)</option>
              {voices.map(v => <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
        )}
        <button class="btn soft small" onClick={() => speak(persona === 'hopper' ? 'Hi! This is how I sound! Neigh-ho!' : 'This is how I sound. Shall we play?', persona)}>🔊 Test voice</button>
        {isPro() && CFG.ai.url && <label class="switch"><input type="checkbox" checked={st.premiumVoice} onChange={() => setS('premiumVoice', !st.premiumVoice)} /><span>Premium voice (needs internet)</span></label>}
        {!kid && <>
          <h4>How much he talks</h4>
          <div class="seg">{['quiet', 'normal', 'chatty'].map(t => <button key={t} class={st.talk === t ? 'on' : ''} onClick={() => setS('talk', t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
          {CFG.ai.url && <label class="switch"><input type="checkbox" checked={st.ai} onChange={() => setS('ai', !st.ai)} /><span>Typed questions (uses the internet)</span></label>}
        </>}
      </section>

      <section class="card">
        <h3>Board</h3>
        <div class="board-themes">
          {BOARDS.map(([id, l]) => (
            <button key={id} class={'bt' + (st.board === id ? ' on' : '')} onClick={() => setS('board', id)}>
              <span class={`swatch theme-${id}`}><i /><i /><i /><i /></span><small>{l}</small>
            </button>
          ))}
        </div>
        <div class="seg">
          <button class={st.pieces === 'classic' ? 'on' : ''} onClick={() => setS('pieces', 'classic')}>Classic pieces</button>
          <button class={st.pieces === 'kids' ? 'on' : ''} onClick={() => setS('pieces', 'kids')}>Storybook pieces</button>
        </div>
        <div class="preview-board"><Board fen="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" interactive={false} set={st.pieces} theme={st.board} coords={st.coords} kids={st.pieces === 'kids'} /></div>
        <label class="switch"><input type="checkbox" checked={st.coords} onChange={() => setS('coords', !st.coords)} /><span>Show coordinates</span></label>
      </section>

      <section class="card">
        <h3>App</h3>
        <label class="switch"><input type="checkbox" checked={st.sound} onChange={() => setS('sound', !st.sound)} /><span>Sounds</span></label>
        {native.isNative && <label class="switch"><input type="checkbox" checked={st.haptics} onChange={() => { setS('haptics', !st.haptics); native.haptic.enable(S.settings.haptics); }} /><span>Vibration</span></label>}
        <div class="seg">{[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([id, l]) => <button key={id} class={st.theme === id ? 'on' : ''} onClick={() => setS('theme', id)}>{l}</button>)}</div>
      </section>

      <section class="card">
        <h3>King's Counsel Pro</h3>
        {isPro() ? <>
          <p>You're Pro ({S.pro.plan}). Thank you for supporting the app.</p>
          {native.isNative && S.pro.plan !== 'lifetime' && <button class="btn soft" onClick={() => native.iap.manage()}>Manage subscription</button>}
        </> : <>
          <p>No ads, unlimited take-backs, more questions for the coach, full reports and a premium voice.</p>
          <button class="btn primary" onClick={() => openSheet({ type: 'paywall' })}>See Pro</button>
        </>}
        {native.isNative && <button class="link" onClick={async () => { const ok = await refreshPro(true); toast(ok ? 'Pro restored ✓' : 'No purchases found'); refresh(); }}>Restore purchases</button>}
      </section>

      <section class="card links">
        <a href={CFG.privacyPolicyUrl} target="_blank" rel="noopener">Privacy policy</a>
        <a href={CFG.termsUrl} target="_blank" rel="noopener">Terms of use</a>
        <a href={`mailto:${CFG.supportEmail}?subject=King's Counsel Chess`}>Contact support</a>
        <button class="link danger" onClick={() => { if (confirm('Erase all games, lessons, rating and the coach\'s memory?')) { resetAll(); location.reload(); } }}>Reset progress</button>
        <p class="fine">Version {CFG.version} · Engine: Stockfish 18 (GPL) · Pieces: cburnett (GPL)</p>
      </section>
    </div>
  );
}

export function Paywall({ reason }) {
  const [prices, setPrices] = useState(CFG.iap.fallbackPrices);
  const [plan, setPlan] = useState('yearly');
  const [busy, setBusy] = useState(false);
  useEffect(() => { native.iap.prices().then(setPrices); }, []);
  async function buy() {
    if (!native.isNative) { toast('Pro is available in the iPhone, iPad and Android apps.'); return; }
    setBusy(true);
    const r = await buyPro(plan);
    setBusy(false);
    if (r === 'bought') { toast('Welcome to Pro 👑'); closeSheet(); }
    else if (r === 'error') toast('The purchase did not go through.');
  }
  return (
    <div class="paywall">
      <div class="pw-crown">👑</div>
      <h2>King's Counsel Pro</h2>
      {reason && <p class="sub">{reason}</p>}
      <ul class="perks">
        <li><b>No ads</b>, ever</li>
        <li><b>Unlimited take-backs</b> in coached games</li>
        <li><b>More questions</b> for your coach every day</li>
        <li><b>Premium voice</b> for the coach</li>
        <li><b>Supports</b> a small independent app</li>
      </ul>
      <div class="plans">
        {[['monthly', 'Monthly', '/month'], ['yearly', 'Yearly', '/year'], ['lifetime', 'Lifetime', 'once']].map(([id, l, per]) => (
          <button key={id} class={'plan' + (plan === id ? ' on' : '')} onClick={() => setPlan(id)}>
            {id === 'yearly' && <span class="tag">Best value</span>}
            <b>{l}</b><span>{prices[id]}</span><small>{per}</small>
          </button>
        ))}
      </div>
      <button class="btn primary big" disabled={busy} onClick={buy}>{busy ? '…' : plan === 'lifetime' ? 'Buy once' : CFG.iap.trialDays && plan === 'yearly' ? `Start ${CFG.iap.trialDays}-day free trial` : 'Subscribe'}</button>
      <p class="fine">{plan === 'lifetime' ? 'One payment, yours forever.' : 'Renews automatically until cancelled. Cancel any time in your store account settings.'}</p>
      <div class="pw-links">
        {native.isNative && <button class="link" onClick={async () => { const ok = await refreshPro(true); toast(ok ? 'Pro restored ✓' : 'No purchases found'); if (ok) closeSheet(); }}>Restore</button>}
        <a href={CFG.termsUrl} target="_blank" rel="noopener">Terms</a>
        <a href={CFG.privacyPolicyUrl} target="_blank" rel="noopener">Privacy</a>
      </div>
      <button class="link" onClick={closeSheet}>Not now</button>
    </div>
  );
}

/** Out of take-backs or questions: watch a short video, or go Pro. */
export function More({ what }) {
  const n = what === 'questions' ? CFG.limits.rewardQuestions : CFG.limits.rewardTakebacks;
  async function watch() {
    const ok = await native.ads.showReward();
    if (!ok) { toast('No video available right now. Try again later.'); return; }
    update(s => { if (what === 'questions') s.bonus.questions += n; else s.bonus.takebacks += n; });
    toast(`+${n} ${what === 'questions' ? 'questions' : 'take-backs'}`);
    closeSheet();
  }
  return (
    <div class="more-sheet">
      <h3>{what === 'questions' ? "That's all your questions for today" : 'Out of take-backs'}</h3>
      <p>{what === 'questions' ? 'Your coach still answers the quick questions any time.' : 'You can still play on and fight.'}</p>
      {native.isNative && !isKid() && <button class="btn primary" onClick={watch}>▶ Watch a short video for {n} more</button>}
      <button class="btn soft" onClick={() => openSheet({ type: 'paywall' })}>Go Pro for unlimited</button>
      <button class="link" onClick={closeSheet}>Close</button>
    </div>
  );
}
