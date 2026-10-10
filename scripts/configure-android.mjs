// Applies app.config.json to the Android project. Safe to run any number of times.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (...p) => path.join(root, ...p);
const cfg = JSON.parse(fs.readFileSync(r('app.config.json'), 'utf8'));
const fail = m => { console.error('✖ ' + m); process.exit(1); };
const AD = cfg.admob.android;
if (!/^ca-app-pub-\d+~\d+$/.test(AD.appId)) fail('admob.android.appId should look like ca-app-pub-1234567890123456~1234567890');
if (!cfg.admob.testMode && AD.appId.startsWith('ca-app-pub-3940256099942544')) fail("testMode is false but the Android AdMob ids are still Google's test ids.");
if (!fs.existsSync(r('android'))) fail('No Android project yet. Run: npx cap add android');

// build.gradle: id + version
const gPath = r('android/app/build.gradle');
let g = fs.readFileSync(gPath, 'utf8');
const code = parseInt(process.env.BUILD_NUMBER || cfg.build, 10);
g = g.replace(/applicationId "[^"]+"/, `applicationId "${cfg.bundleId}"`).replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]+"/, `versionName "${cfg.version}"`);
fs.writeFileSync(gPath, g);

// names
const sPath = r('android/app/src/main/res/values/strings.xml');
const esc = s => s.replace(/'/g, "\\'").replace(/&/g, '&amp;');
let s = fs.readFileSync(sPath, 'utf8');
s = s.replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${esc(cfg.appName)}</string>`)
  .replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${esc(cfg.appName)}</string>`);
fs.writeFileSync(sPath, s);

// AdMob app id in the manifest
const mPath = r('android/app/src/main/AndroidManifest.xml');
let m = fs.readFileSync(mPath, 'utf8');
const meta = `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${AD.appId}"/>`;
if (m.includes('com.google.android.gms.ads.APPLICATION_ID')) m = m.replace(/<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID" android:value="[^"]*"\/>/, meta);
else m = m.replace(/(<application[^>]*>)/, `$1\n        ${meta}`);
fs.writeFileSync(mPath, m);
console.log(`✔ Android project set to ${cfg.bundleId} v${cfg.version} (${code})${cfg.admob.testMode ? '  [TEST ADS]' : '  [LIVE ADS]'}`);
