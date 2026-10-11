# Google Play Console brief: King's Counsel Chess

You are setting up **King's Counsel Chess** in Google Play Console (https://play.google.com/console): a chess app with a live coach, for kids and adults. Use this file, `DESCRIPTION.txt` and the `screenshots/` folder. Work through the sections in order.

## Rules for the agent

1. **Ask the human for anything marked `⟨ASK⟩`.** Never invent contact details, legal names, addresses or URLs.
2. Paste text **exactly** as given.
3. **Stop and ask the human before:**
   - paying the developer registration fee
   - accepting any agreement or policy declaration that isn't covered here
   - setting up the payments profile (bank or tax details)
   - uploading or creating an app signing key
   - **sending any release to review** (testing or production)
4. If a page isn't where this brief says, find the nearest equivalent (Google renames things). Report anything you couldn't complete.

## Values to get from the human first

| Placeholder | What it is |
|---|---|
| ⟨ASK: DEV_ACCOUNT⟩ | Is there already a Google Play developer account? If not, the human must create it and pay the one-time $25 fee themselves. |
| ⟨ASK: ACCOUNT_TYPE⟩ | Personal or organization account. Personal accounts created after November 2023 must run a **closed test with at least 12 testers for 14 days** before production is unlocked. |
| ⟨ASK: AAB⟩ | The signed `.aab` file built by Codemagic's "Android → App Bundle" workflow |
| ⟨ASK: TESTERS⟩ | Email addresses of at least 12 testers (closed test), if needed |

Fixed values:
- App name: `King's Counsel Chess`
- Package name: `com.djtattva.kingscounsel` (it's inside the .aab and can never be changed)
- Website: `https://k00r0.github.io/kings-counsel-chess-site`
- Privacy policy: `https://k00r0.github.io/kings-counsel-chess-site/privacy.html`
- Contact email: `sagarika125@gmail.com`

---

## 1. Create the app
**All apps → Create app**

| Field | Value |
|---|---|
| App name | `King's Counsel Chess` |
| Default language | English (United States) |
| App or game | **Game** |
| Free or paid | **Free** |
| Declarations | Tick Developer Program Policies and US export laws; Play App Signing stays on (the default) |

## 2. Store listing (Grow users → Store presence → Main store listing)

| Field | Value |
|---|---|
| App name (max 30) | `King's Counsel Chess` |
| Short description (max 80) | `A chess coach that talks you through every game and catches your blunders.` |
| Full description (max 4000) | the whole of `DESCRIPTION.txt` |
| App icon (512 × 512) | `screenshots/play-icon-512.png` |
| Feature graphic (1024 × 500) | `screenshots/play-feature-graphic.png` |
| Phone screenshots, in order | `screenshots/android-1-intervention.png` through `screenshots/android-8-kids-quest.png` |
| 7-inch and 10-inch tablet screenshots | `screenshots/ipad-1-intervention.png` to `ipad-6-home.png` (same files for both) |
| Video | none |

**Store settings** (Store presence → Store settings):

| Field | Value |
|---|---|
| Category | Game → **Board** |
| Tags | Chess, Board, Educational, Puzzle (pick what's offered) |
| Email | `sagarika125@gmail.com` |
| Website | `https://k00r0.github.io/kings-counsel-chess-site` |
| Phone | leave empty |

## 3. App content (Policy and programs → App content)

Complete every declaration:

### Privacy policy
`https://k00r0.github.io/kings-counsel-chess-site/privacy.html`

### Ads
**Yes, my app contains ads** (Google AdMob).

### App access
**All functionality is available without any special access.** No login exists.

### Content rating (IARC questionnaire)
- Email: `sagarika125@gmail.com`
- Category: **Game** (or "All other app types" if the questionnaire asks for a non-game)
- Violence, fear, sexuality, language, controlled substances, gambling: **No** to every question
- Simulated gambling: No
- User interaction: users **cannot** chat with or share content with other users
- Shares the user's location: No
- Digital purchases: **Yes**
- If asked about generative AI or AI chatbots: **Yes**. Players 13+ can type chess questions, which an AI answers. Answers are limited to chess, and there is no user-to-user content.
- Expected rating: Everyone / PEGI 3 (an AI answer may move it). Report the result; don't change answers to lower it.

### Target audience and content
- Target age groups: **6–8, 9–12, 13–15, 16–17, 18 and over**
- Appeals to children: **Yes**
- This puts the app under the **Families policy**. Confirm these if asked:
  - The app asks the player's age (neutral age screen) before any ads.
  - Under-13s get child-directed ads through AdMob (a Families-certified ad SDK), and typed AI questions are disabled for them.
  - No ads during play.
- Teacher Approved program: **don't** opt in for now.

### Data safety
Answer these questions:

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **No**. There's no account; game data stays on the device and is deleted with the app. Typed questions aren't stored. |

Then declare:

| Data type | Collected | Shared | Processed ephemerally | Required/optional | Purposes |
|---|---|---|---|---|---|
| Device or other IDs | Yes | Yes (AdMob) | No | Required | Advertising or marketing, Analytics, Fraud prevention/security |
| App activity → App interactions | Yes | Yes (AdMob) | No | Required | Advertising or marketing, Analytics |
| App info and performance → Crash logs | Yes | Yes (AdMob) | No | Required | Analytics |
| App info and performance → Diagnostics | Yes | Yes (AdMob) | No | Required | Analytics |
| Approximate location | Yes | Yes (AdMob) | No | Required | Advertising or marketing, Analytics |
| Messages → Other in-app messages (typed chess questions) | Yes | No | **Yes** | Optional | App functionality |

If Google's AdMob guidance (https://developers.google.com/admob/android/privacy/play-data-disclosure) lists something different for the AdMob rows, follow Google's list.

### Advertising ID
**Yes**, the app uses the advertising ID, for **Advertising or marketing** and **Analytics** (through AdMob).

### Government apps, Financial features, Health, News, COVID-19
Not applicable / **No** for all.

## 4. Monetization (Monetize with Play → Products)

**Prerequisite:** a payments profile must be set up. If it isn't, stop and tell the human.

### Subscriptions
Create two subscriptions. Base plan IDs must match **exactly**, because the app asks for them by name.

| Field | Monthly | Yearly |
|---|---|---|
| Product ID | `com.djtattva.kingscounsel.pro.monthly` | `com.djtattva.kingscounsel.pro.yearly` |
| Name | `Pro (monthly)` | `Pro (yearly)` |
| Benefits (description) | `No ads, unlimited take-backs, premium voice.` | `No ads, unlimited take-backs, premium voice.` |
| Base plan ID | `monthly` | `yearly` |
| Base plan type | Auto-renewing, billing period 1 month | Auto-renewing, billing period 1 year |
| Price | USD 4.99 (let Google convert other countries) | USD 29.99 |
| Offer | none | Free trial **7 days**, new customers only (offer ID `trial7`) |

Activate both base plans and the offer.

### In-app product
| Field | Value |
|---|---|
| Product ID | `com.djtattva.kingscounsel.pro.lifetime` |
| Name | `Pro (lifetime)` |
| Description | `Everything in Pro, forever. One payment.` |
| Price | USD 59.99 |

Activate it.

**Note:** Play won't let you create products until an app bundle with billing has been uploaded to any track. If it refuses, do section 5 (internal testing) first, then come back.

## 5. Testing and release

1. **Internal testing** (Test and release → Testing → Internal testing → Create new release): upload ⟨ASK: AAB⟩. Release name `1.0.0 (build N)`. Release notes:
   ```
   First release: a chess coach who catches your blunders, lets you take it back, and remembers what you need to work on.
   ```
   Add the human as a tester. **Ask the human before you roll it out.**
2. **Closed testing**, if ⟨ASK: ACCOUNT_TYPE⟩ is a newer personal account: create a closed track, add ⟨ASK: TESTERS⟩ (12 or more), and promote the same build. Tell the human that production unlocks after 14 days of testing, and that Google then asks a few questions about the test.
3. **Production**: only when the human says so. Countries: all. Promote the tested build, then **ask the human** before sending it for review.

## 6. Final check, then hand back to the human

- [ ] Store listing complete: text, icon, feature graphic, 8 phone + 6 tablet screenshots
- [ ] All App content declarations show a green tick
- [ ] Content rating received (report it)
- [ ] Data safety submitted
- [ ] 2 subscriptions (with base plans `monthly`/`yearly`) and 1 lifetime product active
- [ ] Internal test release uploaded
- [ ] Closed-test status, and the date production unlocks, reported to the human

Tell the human what's done and what's waiting on them.
