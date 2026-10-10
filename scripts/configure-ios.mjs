// Applies app.config.json to the native iOS project. Safe to run any number of times.
import fs from 'node:fs';
import path from 'node:path';
import * as plistNs from 'plist';
const plist = plistNs.default || plistNs;
import xcodeNs from 'xcode';
const xcode = xcodeNs.default || xcodeNs;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (...p) => path.join(root, ...p);
const cfg = JSON.parse(fs.readFileSync(r('app.config.json'), 'utf8'));
const fail = m => { console.error('✖ ' + m); process.exit(1); };

// ---- sanity checks, so mistakes are caught before Apple does ----
if (!/^[A-Za-z0-9.-]+\.[A-Za-z0-9-]+$/.test(cfg.bundleId)) fail('bundleId should look like com.yourname.appname');
const AD = cfg.admob.ios;
if (!/^ca-app-pub-\d+~\d+$/.test(AD.appId)) fail('admob.ios.appId should look like ca-app-pub-1234567890123456~1234567890');
for (const k of ['bannerId', 'interstitialId', 'rewardedId'])
  if (!/^ca-app-pub-\d+\/\d+$/.test(AD[k])) fail(`admob.ios.${k} should look like ca-app-pub-1234567890123456/1234567890`);
const usingTestIds = AD.appId.startsWith('ca-app-pub-3940256099942544');
if (!cfg.admob.testMode && usingTestIds) fail("testMode is false but the AdMob ids are still Google's test ids. Paste your own ids from AdMob.");
if (!/^\d+\.\d+\.\d+$/.test(cfg.version)) fail('version should look like 1.0.0');
for (const k of ['monthly', 'yearly', 'lifetime'])
  if (!cfg.iap[k] || !cfg.iap[k].startsWith(cfg.bundleId)) console.warn(`! iap.${k} usually starts with your bundle id (${cfg.bundleId}.pro.${k})`);
if (/YOUR-SITE/.test(cfg.privacyPolicyUrl)) console.warn('! privacyPolicyUrl still has YOUR-SITE in it. Fine for testing; fix it before you submit.');

// ---- capacitor.config.json ----
const capPath = r('capacitor.config.json');
const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
cap.appId = cfg.bundleId; cap.appName = cfg.appName;
fs.writeFileSync(capPath, JSON.stringify(cap, null, 2) + '\n');

// ---- Info.plist ----
const infoPath = r('ios/App/App/Info.plist');
if (!fs.existsSync(infoPath)) fail('No iOS project yet. Run: npx cap add ios');
const info = plist.parse(fs.readFileSync(infoPath, 'utf8'));
info.CFBundleDisplayName = cfg.appName;
info.GADApplicationIdentifier = AD.appId;
// Ad networks that may show ads through Google (Google's recommended starter list).
info.SKAdNetworkItems = [
  'cstr6suwn9', '4fzdc2evr5', '2fnua5tdw4', 'ydx93a7ass', 'p78axxw29g', 'v72qych5uu', 'ludvb6z3bs', 'cp8zw746q7',
  '3sh42y64q3', 'c6k4g5qg8m', 's39g8k73mm', 'wg4vff78zm', '3qy4746246', 'f38h382jlk', 'hs6bdukanm', 'mlmmfzh3r3',
  'v4nxqhlyqp', 'wzmmz9fp6w', 'su67r6k2v3', 'yclnxrl5pm', 't38b2kh725', '7ug5zh24hu', 'gta9lk7p23', 'vutu7akeur',
  'y5ghdn5j9k', 'v9wttpbfk9', 'n38lu8286q', '47vhws6wlr', 'kbd757ywx3', '9t245vhmpl', 'a2p9lx4jpn', '22mmun2rn5',
  '44jx6755aq', 'k674qkevps', '4468km3ulz', '2u9pt9hc89', '8s468mfl3y', 'klf5c3l5u5', 'ppxm28t8ap', 'kbmxgpxpgc',
  'uw77j35x4d', '578prtvx9j', '4dzt52r2t5', 'tl55sbb4fm', 'c3frkrj4fj', 'e5fvkxwrpn', '8c4e2ghe7u', '3rd42ekr43',
  '97r2b46745', '3qcr597p9d',
].map(id => ({ SKAdNetworkIdentifier: id + '.skadnetwork' }));
// Shown only to adults (18+) before personalized ads. Under-18s never see it and get non-personalized ads.
info.NSUserTrackingUsageDescription = "Allowing tracking lets King's Counsel show ads that match your interests. Ads keep the coach free. You can say no and still use everything.";
info.ITSAppUsesNonExemptEncryption = false; // skips the export-compliance question on every upload
info.UIRequiredDeviceCapabilities = ['arm64'];
info.UISupportedInterfaceOrientations = ['UIInterfaceOrientationPortrait'];
// iPad (and Apple silicon Macs): any orientation, so the side-by-side code + game layout has room.
info['UISupportedInterfaceOrientations~ipad'] = ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'];
info.UIRequiresFullScreen = false;
info.UIStatusBarStyle = 'UIStatusBarStyleLightContent';
info.UIViewControllerBasedStatusBarAppearance = true;
info.LSApplicationQueriesSchemes = ['mailto'];
fs.writeFileSync(infoPath, plist.build(info, { indent: '\t' }) + '\n');

// ---- Privacy manifest (Apple requires one) ----
// Ads: Google's SDK ships its own manifest declaring what it collects. This one covers the app's own code.
const privacy = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [],
  NSPrivacyAccessedAPITypes: [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
  ],
};
fs.writeFileSync(r('ios/App/App/PrivacyInfo.xcprivacy'), plist.build(privacy, { indent: '\t' }) + '\n');

// ---- Xcode project: bundle id, version, iPhone + iPad, iOS 16.4+ ----
const pbxPath = r('ios/App/App.xcodeproj/project.pbxproj');
const proj = xcode.project(pbxPath); proj.parseSync();
const configs = proj.pbxXCBuildConfigurationSection();
for (const key in configs) {
  const bs = configs[key].buildSettings;
  if (!bs) continue;
  if (bs.IPHONEOS_DEPLOYMENT_TARGET) bs.IPHONEOS_DEPLOYMENT_TARGET = '15.0';
  if (!bs.PRODUCT_BUNDLE_IDENTIFIER) continue;
  bs.PRODUCT_BUNDLE_IDENTIFIER = cfg.bundleId;
  bs.MARKETING_VERSION = cfg.version;
  bs.CURRENT_PROJECT_VERSION = String(process.env.BUILD_NUMBER || cfg.build); // cloud builds number themselves
  bs.TARGETED_DEVICE_FAMILY = '"1,2"'; // iPhone and iPad (Macs run the iPad version)
  bs.SUPPORTS_MACCATALYST = 'NO';
  bs.INFOPLIST_KEY_CFBundleDisplayName = `"${cfg.appName.replace(/"/g, '\\"')}"`;
  bs.INFOPLIST_KEY_LSApplicationCategoryType = '"public.app-category.board-games"';
}
fs.writeFileSync(pbxPath, proj.writeSync());

// Register PrivacyInfo.xcprivacy as a bundled resource, next to config.xml (plain text edit, done once).
let pbx = fs.readFileSync(pbxPath, 'utf8');
if (!pbx.includes('PrivacyInfo.xcprivacy')) {
  const FILE = 'A1B2C3D4E5F6A7B8C9D0E1F2', BUILD = 'A1B2C3D4E5F6A7B8C9D0E1F3';
  const add = (re, line) => { const m = pbx.match(re); if (!m) fail('Unexpected Xcode project layout'); pbx = pbx.replace(m[0], m[0] + line); };
  add(/\t\t\w{24} \/\* config\.xml in Resources \*\/ = \{isa = PBXBuildFile;[^\n]*\n/, `\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${FILE} /* PrivacyInfo.xcprivacy */; };\n`);
  add(/\t\t\w{24} \/\* config\.xml \*\/ = \{isa = PBXFileReference;[^\n]*\n/, `\t\t${FILE} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n`);
  add(/\t\t\t\t\w{24} \/\* config\.xml \*\/,\n/, `\t\t\t\t${FILE} /* PrivacyInfo.xcprivacy */,\n`);
  add(/\t\t\t\t\w{24} \/\* config\.xml in Resources \*\/,\n/, `\t\t\t\t${BUILD} /* PrivacyInfo.xcprivacy in Resources */,\n`);
  fs.writeFileSync(pbxPath, pbx);
}

console.log(`✔ iOS project set to ${cfg.bundleId} v${cfg.version} (${process.env.BUILD_NUMBER || cfg.build})${cfg.admob.testMode ? '  [TEST ADS]' : '  [LIVE ADS]'}`);
