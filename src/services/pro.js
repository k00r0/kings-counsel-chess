// Pro status and ads, glued to the app state.
import { native } from '../native.js';
import { S, update, isPro, age } from '../store.js';

export async function refreshPro(restore = false) {
  const st = restore ? await native.iap.restore() : await native.iap.status();
  if (!st) return isPro();
  update(s => { s.pro = { active: st.active, plan: st.plan, checked: Date.now() }; });
  if (st.active) native.ads.removeAll();
  return st.active;
}

export async function buyPro(plan) {
  const r = await native.iap.buy(plan);
  if (r === 'bought') {
    update(s => { s.pro = { active: true, plan, checked: Date.now() }; });
    native.ads.removeAll();
    setTimeout(() => refreshPro(), 1500);
  }
  return r;
}

// Banners only on menus, never during a game or a lesson.
const BANNER_SCREENS = new Set(['home', 'learn', 'journal', 'me', 'puzzles-menu']);
export function syncAds(routeName, sheetOpen) {
  const show = native.isNative && S.onboarded && !isPro() && BANNER_SCREENS.has(routeName) && !sheetOpen;
  show ? native.ads.show() : native.ads.hide();
}
export function startAds() {
  if (!native.isNative || isPro() || !S.onboarded) return;
  native.ads.init(age());
}
