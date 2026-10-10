# King's Counsel Chess: owner's guide

Chess with a live coach at your side. The Vizier coaches teens and adults; Hopper the little knight coaches kids. He warns you before a blunder costs you, pauses the clock to offer **Take it back · Show me · Play on**, remembers your weaknesses from game to game, and writes an advisor's report every 10 games.

Runs on iPhone, iPad, Android, Mac/PC browsers. The chess engine (Stockfish 18) and the coach run **on the device, offline**. The internet is only used for typed questions to the coach, the Pro premium voice, ads and purchases.

---

## 1. What's where

| Folder / file | What it is |
|---|---|
| `app.config.json` | **The one file you edit**: app name, bundle id, AdMob ids, Pro product ids, AI server address, limits |
| `src/coach/vizier.js`, `src/coach/hopper.js` | Everything the coaches say (~750 lines of dialogue). Add lines freely |
| `src/lessons/paths.js` | The Squire / Knight / Master lessons |
| `content/` | Puzzle bank (mined from engine games, ~900 puzzles) and the checked lesson file |
| `worker/` | The small AI server for Cloudflare (typed questions, report write-ups, premium voice) |
| `ios/`, `android/` | Native projects (generated; don't edit by hand) |
| `codemagic.yaml` | Cloud builds: iOS → TestFlight, Android → App Bundle |
| `store/` | Website landing page and privacy policy |

## 2. Try it in a browser

```
npm install
npm run preview      # opens on http://localhost:5173
```

## 3. Accounts to set up (all free except the app stores)

| Service | Cost | What it's for |
|---|---|---|
| GitHub (you have it) | free | Code + the website on GitHub Pages |
| Cloudflare | free (100k requests/day) | Hosts the AI helper |
| Groq | free tier (~1,000 questions/day on gpt-oss-120b) | The AI that answers typed questions |
| AdMob (you have it) | free | Ads |
| Apple Developer (you have it) | $99/year | App Store |
| Google Play Console | **$25 once** | Android store (only if you want Android) |
| Codemagic (you have it) | free tier | Builds the apps in the cloud |

Not used on purpose: Gemini's free tier (it trains on your users' data and isn't allowed in the EU).

### 3a. GitHub
Create an **empty public** repository named `kings-counsel-chess` (no README). Public is required: the engine is GPL, so the app's source must be available, and GitHub Pages is free only for public repos. Tell Claude when it exists; Claude pushes the code and the website (`gh-pages` branch). Then in the repo: Settings → Pages → Branch `gh-pages` → Save. The site appears at `https://k00r0.github.io/kings-counsel-chess`.

### 3b. Turn on the AI coach (Cloudflare + Groq)
**Never paste keys into a chat.** You type them straight into Cloudflare.

1. **Groq**: sign up at console.groq.com → API Keys → Create. Copy the key (starts with `gsk_`).
2. **Cloudflare**: sign up at dash.cloudflare.com → Workers & Pages → Create → Create Worker → name it `kings-counsel-ai` → Deploy → **Edit code** → replace everything with the contents of `worker/src/index.js` → Deploy.
3. In the worker → **Settings → Variables and Secrets**:
   - Secret `GROQ_API_KEY` = your Groq key
   - Text `GROQ_MODEL` = `openai/gpt-oss-120b`
   - Text `FALLBACK_MODEL` = `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
   - Text `ALLOWED_ORIGINS` = `capacitor://localhost,https://localhost,http://localhost,https://k00r0.github.io`
4. **Settings → Bindings → Add → Workers AI**, variable name `AI` (backup brain + premium voice).
5. Copy the worker address (like `https://kings-counsel-ai.yourname.workers.dev`) into `app.config.json` → `"ai": { "url": "..." }`. Rebuild.

(Prefer the terminal? `cd worker && npx wrangler login && npx wrangler secret put GROQ_API_KEY && npx wrangler deploy`.)

Without this step the app still works: the coach answers with quick-question buttons instead of typed questions. Kids never use the AI.

### 3c. AdMob
In AdMob create **two apps** (iOS and Android, "not yet listed" is fine) and in each one three ad units: **Banner**, **Interstitial**, **Rewarded**. Paste the 8 ids into `app.config.json` under `admob.ios` and `admob.android`, then set `"testMode": false`. Ads appear only on menus and after a game, never on the board.

### 3d. App Store Connect
New app → bundle id `com.djtattva.kingscounsel` → name **King's Counsel Chess**. In-App Purchases:
- Auto-renewable subscriptions (one group "Pro"): `com.djtattva.kingscounsel.pro.monthly` ($4.99), `com.djtattva.kingscounsel.pro.yearly` ($29.99, 7-day free trial)
- Non-consumable: `com.djtattva.kingscounsel.pro.lifetime` ($59.99)
Category: Games → Board. Age rating: 4+.

### 3e. Google Play (optional)
Create the app with package `com.djtattva.kingscounsel`. Subscriptions `...pro.monthly` and `...pro.yearly` each need a base plan with id `monthly` / `yearly`; in-app product `...pro.lifetime`. In Codemagic upload a keystore named `kings_counsel_keystore` (Codemagic can generate one; **keep a backup**, you can never replace it).

### 3f. Codemagic
Add the GitHub repo → it reads `codemagic.yaml`. `iOS → TestFlight` uses your existing App Store Connect integration ("Focus Sprint") and signing group, same as your other apps. `Android → App Bundle` produces the `.aab` to upload to Play Console.

## 4. Everyday changes

- **Rename** (e.g. to "King's Council Chess"): change `appName` in `app.config.json`, and the name in App Store Connect / Play Console. No other code changes.
- **Prices / limits**: `app.config.json` → `iap.fallbackPrices`, `limits` (free take-backs per game, questions per day, reward-video bonuses).
- **New coach lines**: add strings to any list in `src/coach/vizier.js` or `hopper.js`. `{piece}`, `{sq}` etc. are filled in automatically; `[a|b]` picks one at random. The coach rotates through every line before repeating one, across games.
- **Lessons**: edit `src/lessons/paths.js`, then `npm run content`. Every position is checked by the engine; it refuses to build if a solution is wrong.
- **More puzzles**: `node tools/mine-puzzles.mjs 300 content/mined.json` (engine plays itself and keeps positions with exactly one winning move), then `npm run content`.

## 5. How the coach thinks (in one paragraph)

Every move is checked by Stockfish. When your move drops your winning chances a lot, the board detectors work out **why** (piece left hanging, walked into a fork, ignored his threat, missed a mate…), and the coach voices that reason in his own words, then offers a take-back. He checks his notebook first: if the same weakness happened in an earlier game, he says so. The opponent is the same engine, playing like a human of your strength: mostly sensible, occasionally sloppy, and a little softer when you're in trouble in a coached game, so wins are always possible but always earned.

## 6. Licences

Stockfish (GPLv3) and the cburnett piece set (GPL) mean the app is GPLv3 too: keep the GitHub repo public. That's allowed in the App Store and Google Play. Kids' pieces, coaches, art and all dialogue are original.
