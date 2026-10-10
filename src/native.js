// Everything that talks to iOS / Android. In a browser each function falls back to something sensible,
// so the same app runs as the website version too.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, MaxAdContentRating, AdmobConsentStatus } from '@capacitor-community/admob';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';

export const CFG = __APP_CONFIG__;
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();           // 'ios' | 'android' | 'web'
const AD = CFG.admob[platform === 'android' ? 'android' : 'ios'];
const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { console.warn('[native]', e && e.message || e); return fallback; } };

// ---------- storage (a phone may clear a web view's localStorage, so keep a native copy) ----------
const storage = {
  async get(key) {
    if (isNative) { const v = await safe(() => Preferences.get({ key }), null); if (v && v.value) return v.value; }
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* full or blocked */ }
    if (isNative) await safe(() => Preferences.set({ key, value }));
  },
};

// ---------- haptics ----------
let hapticsOn = true;
const haptic = {
  enable(on) { hapticsOn = on; },
  tap: () => isNative && hapticsOn && safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  thud: () => isNative && hapticsOn && safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  ok: () => isNative && hapticsOn && safe(() => Haptics.notification({ type: NotificationType.Success })),
  bad: () => isNative && hapticsOn && safe(() => Haptics.notification({ type: NotificationType.Warning })),
};

// ---------- voice: the device's own speech engine (works offline) ----------
// Android's web view has no Web Speech, so on phones we always use the native plugin.
const voice = {
  async list() {
    if (isNative) { const r = await safe(() => TextToSpeech.getSupportedVoices(), { voices: [] }); return (r.voices || []).map((v, i) => ({ id: i, name: v.name, lang: v.lang, local: v.localService !== false })); }
    if (!window.speechSynthesis) return [];
    let vs = speechSynthesis.getVoices();
    if (!vs.length) { await new Promise(r => { speechSynthesis.onvoiceschanged = r; setTimeout(r, 800); }); vs = speechSynthesis.getVoices(); }
    return vs.map((v, i) => ({ id: i, name: v.name, lang: v.lang, local: v.localService }));
  },
  /** Resolves when finished (or stopped). */
  async speak(text, { voiceId = null, rate = 1, pitch = 1, lang = 'en-GB' } = {}) {
    if (isNative) {
      await safe(() => TextToSpeech.speak({ text, lang, rate, pitch, volume: 1, voice: voiceId ?? undefined, category: 'playback', queueStrategy: 0 }));
      return;
    }
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    await new Promise(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      if (voiceId != null && vs[voiceId]) u.voice = vs[voiceId]; else u.lang = lang;
      u.rate = rate; u.pitch = pitch;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
      // Safari sometimes never fires onend
      setTimeout(resolve, 1500 + text.length * 110);
    });
  },
  stop() { if (isNative) safe(() => TextToSpeech.stop()); else if (window.speechSynthesis) speechSynthesis.cancel(); },
};

// ---------- ads ----------
// Under 18: no tracking, non-personalized, age-appropriate ads. Under 13: child-directed.
// 18+: Google's consent form where the law requires it (EU/UK), then Apple's tracking prompt on iOS.
const ads = {
  ready: false, wanted: false, showing: false, loaded: false, npa: true, height: 0, onHeight: () => {},
  interstitialReady: false, rewardReady: false,
  async init(age) {
    if (!isNative || ads.ready) return;
    const minor = age == null || age < 18;
    await safe(async () => {
      if (!minor) {
        const info = await AdMob.requestConsentInfo({});
        if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) await AdMob.showConsentForm();
        if (platform === 'ios') {
          const t = await AdMob.trackingAuthorizationStatus();
          if (t.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
          const t2 = await AdMob.trackingAuthorizationStatus();
          ads.npa = t2.status !== 'authorized';
        } else ads.npa = false;
      }
      const child = age != null && age < 13;
      await AdMob.initialize({
        tagForChildDirectedTreatment: child,
        tagForUnderAgeOfConsent: minor,
        maxAdContentRating: child ? MaxAdContentRating.General : minor ? MaxAdContentRating.ParentalGuidance : MaxAdContentRating.Teen,
        initializeForTesting: !!CFG.admob.testMode,
      });
      AdMob.addListener(BannerAdPluginEvents.SizeChanged, info => {
        ads.height = ads.showing ? Math.round(info.height || 0) : 0;
        ads.onHeight(ads.height);
      });
      ads.ready = true;
      ads.prepareInterstitial();
      ads.prepareReward();
    });
    if (ads.wanted) ads.show();
  },
  async show() {
    ads.wanted = true;
    if (!isNative || !ads.ready || ads.showing) return;
    ads.showing = true;
    if (ads.loaded) { await safe(() => AdMob.resumeBanner()); ads.onHeight(ads.height || 50); return; }
    ads.loaded = true;
    await safe(() => AdMob.showBanner({ adId: AD.bannerId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, npa: ads.npa, isTesting: !!CFG.admob.testMode }));
  },
  async hide() {
    ads.wanted = false;
    if (!isNative || !ads.showing) return;
    ads.showing = false; ads.onHeight(0);
    await safe(() => AdMob.hideBanner());
  },
  async removeAll() {
    ads.wanted = false; ads.showing = false; ads.loaded = false; ads.interstitialReady = false; ads.onHeight(0);
    if (isNative) await safe(() => AdMob.removeBanner());
  },
  async prepareInterstitial() {
    if (!isNative || !ads.ready || ads.interstitialReady) return;
    const r = await safe(() => AdMob.prepareInterstitial({ adId: AD.interstitialId, npa: ads.npa, isTesting: !!CFG.admob.testMode }), null);
    ads.interstitialReady = !!r;
  },
  async showInterstitial() {
    if (!isNative || !ads.interstitialReady) return false;
    ads.interstitialReady = false;
    const ok = await safe(() => AdMob.showInterstitial().then(() => true), false);
    setTimeout(() => ads.prepareInterstitial(), 2000);
    return ok;
  },
  async prepareReward() {
    if (!isNative || !ads.ready || ads.rewardReady || !AD.rewardedId) return;
    const r = await safe(() => AdMob.prepareRewardVideoAd({ adId: AD.rewardedId, npa: ads.npa, isTesting: !!CFG.admob.testMode }), null);
    ads.rewardReady = !!r;
  },
  /** true if the player watched to the end. On the web (no ads) it just says yes. */
  async showReward() {
    if (!isNative) return true;
    if (!ads.ready) return false;
    if (!ads.rewardReady) await ads.prepareReward();
    if (!ads.rewardReady) return false;
    ads.rewardReady = false;
    const item = await safe(() => AdMob.showRewardVideoAd(), null);
    setTimeout(() => ads.prepareReward(), 2000);
    return !!item;
  },
};

// ---------- Pro: subscriptions + lifetime (App Store / Google Play, no server) ----------
const IDS = CFG.iap;
const PLAN_OF = { [IDS.monthly]: 'monthly', [IDS.yearly]: 'yearly', [IDS.lifetime]: 'lifetime' };
const iap = {
  available: isNative,
  async prices() {
    const out = { ...IDS.fallbackPrices };
    if (!isNative) return out;
    for (const [type, ids] of [[PURCHASE_TYPE.SUBS, [IDS.monthly, IDS.yearly]], [PURCHASE_TYPE.INAPP, [IDS.lifetime]]]) {
      const r = await safe(() => NativePurchases.getProducts({ productIdentifiers: ids, productType: type }), null);
      for (const p of (r && r.products) || []) { const plan = PLAN_OF[p.identifier || p.productIdentifier]; if (plan) out[plan] = p.priceString; }
    }
    return out;
  },
  async status() {
    if (!isNative) return null;
    const r = await safe(() => NativePurchases.getPurchases({ onlyCurrentEntitlements: true }), null);
    if (!r) return null;
    let best = null;
    for (const t of r.purchases || []) {
      const plan = PLAN_OF[t.productIdentifier];
      if (!plan) continue;
      if (plan === 'lifetime') return { active: true, plan };
      const live = t.isActive !== false && (!t.expirationDate || new Date(t.expirationDate).getTime() > Date.now());
      if (live) best = { active: true, plan };
    }
    return best || { active: false, plan: null };
  },
  async buy(plan) {
    if (!isNative) return 'web';
    const id = IDS[plan];
    try {
      const opts = { productIdentifier: id, quantity: 1, productType: plan === 'lifetime' ? PURCHASE_TYPE.INAPP : PURCHASE_TYPE.SUBS };
      if (platform === 'android' && plan !== 'lifetime') opts.planIdentifier = IDS.androidPlans[plan];
      await NativePurchases.purchaseProduct(opts);
      return 'bought';
    } catch (e) {
      return /cancel/i.test(String(e && (e.message || e.code) || e)) ? 'cancelled' : 'error';
    }
  },
  async restore() {
    if (!isNative) return null;
    await safe(() => NativePurchases.restorePurchases());
    return iap.status();
  },
  async manage() { if (isNative) await safe(() => NativePurchases.manageSubscriptions()); },
};

const shell = {
  async ready(dark) {
    if (!isNative) return;
    await safe(() => StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }));
    await safe(() => SplashScreen.hide({ fadeOutDuration: 250 }));
  },
  async setDark(dark) { if (isNative) await safe(() => StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })); },
  openUrl(url) { window.open(url, '_blank', 'noopener'); },
  keepAwake(on) { if (isNative) safe(() => (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep())); },
  onBack(fn) { if (isNative) CapApp.addListener('backButton', fn); },
  onResume(fn) { if (isNative) CapApp.addListener('resume', fn); },
};

export const native = { isNative, platform, storage, haptic, voice, ads, iap, shell };
