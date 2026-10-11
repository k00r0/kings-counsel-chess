# App Store Connect brief: King's Counsel Chess

You are filling in App Store Connect (https://appstoreconnect.apple.com) for the iOS/iPadOS app **King's Counsel Chess**: a chess app with a live coach, for kids and adults. Everything you need is in this file, `DESCRIPTION.txt`, and the `screenshots/` folder. Work through the sections in order.

## Rules for the agent

1. **Ask the human for anything marked `⟨ASK⟩`.** Never invent contact details, legal names, addresses or URLs.
2. **Do not choose "Made for Kids" or the Kids category.** The app is for all ages but carries banner ads, which the Kids category doesn't allow. It is listed under Games → Board.
3. Paste text **exactly** as given: no extra claims, no edits.
4. **Stop and ask the human before:**
   - accepting any agreement
   - entering bank or tax details
   - pressing **Submit for Review** or **Release**
5. If a field or menu isn't where this brief says, find the nearest equivalent (Apple renames things). Report anything you couldn't complete.

## Values to get from the human first

| Placeholder | What it is |
|---|---|
| ⟨ASK: NAME⟩ | Developer or seller name, as on the Apple Developer account |
| ⟨ASK: PHONE⟩ | Phone number for the App Review team (not public) |
| ⟨ASK: TRADER⟩ | EU Digital Services Act trader status (see section 9) |

Fixed values:
- Website (support and marketing URL): `https://k00r0.github.io/kings-counsel-chess-site`
- Privacy policy: `https://k00r0.github.io/kings-counsel-chess-site/privacy.html`
- Support email: `sagarika125@gmail.com`

---

## 1. Create the app record

Only do this if it doesn't exist yet. Go to **Apps → + → New App**:

| Field | Value |
|---|---|
| Platforms | iOS |
| Name | `King's Counsel Chess` |
| Primary language | English (U.S.) |
| Bundle ID | `com.djtattva.kingscounsel` |
| SKU | `kings-counsel-chess-001` |
| User access | Full Access |

If `com.djtattva.kingscounsel` isn't in the Bundle ID list, register it first at https://developer.apple.com/account/resources/identifiers (App IDs → +, explicit bundle ID, description "King's Counsel Chess", no extra capabilities beyond the defaults; In-App Purchase is on by default). Stop and tell the human if you can't.

## 2. App Information (left menu → General → App Information)

| Field | Value |
|---|---|
| Name (max 30) | `King's Counsel Chess` |
| Subtitle (max 30) | `Chess coach who talks to you` |
| Primary category | Games, subcategory **Board** |
| Secondary category | Education |
| Content Rights | "Does your app contain, show, or access third-party content?" Choose **No** |
| Age Rating | Answer the questionnaire in section 7 |
| License Agreement | Apple's standard EULA (leave the default) |

## 3. Pricing and Availability

| Field | Value |
|---|---|
| Price | Free (USD 0) |
| Availability | All countries and regions (unless the human decides otherwise because of the EU trader question in section 9) |
| iPhone and iPad apps on Apple silicon Mac | Leave available (the default) |

## 4. In-app purchases

**Prerequisite:** the **Paid Apps** agreement must be active under **Business** (or **Agreements, Tax, and Banking**). If it isn't, stop and tell the human; only they can accept it and add bank and tax details.

### 4a. Subscriptions
**Monetization → Subscriptions → Create subscription group**, named `King's Counsel Pro`. Group display name (localization): `King's Counsel Pro`.

Add two subscriptions to the group:

| Field | Monthly | Yearly |
|---|---|---|
| Reference name | `Pro Monthly` | `Pro Yearly` |
| Product ID | `com.djtattva.kingscounsel.pro.monthly` | `com.djtattva.kingscounsel.pro.yearly` |
| Duration | 1 month | 1 year |
| Price (USD base) | 4.99 | 29.99 |
| Availability | All countries | All countries |
| Localization display name | `Pro (monthly)` | `Pro (yearly)` |
| Localization description | `No ads, unlimited take-backs, premium voice.` | `No ads, unlimited take-backs, premium voice.` |
| Introductory offer | None | **Free trial, 1 week**, all countries, new subscribers |
| Review screenshot | `screenshots/iap-review-paywall.png` | `screenshots/iap-review-paywall.png` |
| Review notes | `Home tab: tap "Go Pro" at the bottom, or Me tab: "See Pro". Choose Monthly.` | `Home tab: tap "Go Pro", or Me tab: "See Pro". Yearly is preselected.` |

Product IDs must match **exactly**; the app looks them up by these strings.

### 4b. Lifetime purchase
**Monetization → In-App Purchases → +**

| Field | Value |
|---|---|
| Type | Non-Consumable |
| Reference name | `Pro Lifetime` |
| Product ID | `com.djtattva.kingscounsel.pro.lifetime` |
| Price (USD) | 59.99 |
| Availability | All countries |
| Localization display name | `Pro (lifetime)` |
| Localization description | `Everything in Pro, forever. One payment.` |
| Review screenshot | `screenshots/iap-review-paywall.png` |
| Review notes | `Home tab: tap "Go Pro", choose Lifetime.` |

## 5. Version page (left menu → iOS App → 1.0 Prepare for Submission)

### 5a. Screenshots

**iPhone 6.9" Display** (1320 × 2868), upload in this order:
1. `screenshots/iphone-1-intervention.png`
2. `screenshots/iphone-2-showme.png`
3. `screenshots/iphone-3-home.png`
4. `screenshots/iphone-4-result.png`
5. `screenshots/iphone-5-report.png`
6. `screenshots/iphone-6-kids-game.png`
7. `screenshots/iphone-7-puzzle.png`
8. `screenshots/iphone-8-kids-quest.png`

**iPad 13" Display** (2064 × 2752), upload in this order:
1. `screenshots/ipad-1-intervention.png`
2. `screenshots/ipad-2-report.png`
3. `screenshots/ipad-3-result.png`
4. `screenshots/ipad-4-kids-game.png`
5. `screenshots/ipad-5-lessons.png`
6. `screenshots/ipad-6-home.png`

Leave the smaller sizes empty: Apple scales these down. No app preview videos.

### 5b. Text fields

**Promotional Text** (max 170):
```
A coach who catches your blunders before they cost you. Take it back, see why, or play on. Plus an advisor's report every 10 games.
```

**Description** (max 4000): paste the whole of `DESCRIPTION.txt`, then add these lines at the end:
```

Payment is charged to your Apple ID. Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://k00r0.github.io/kings-counsel-chess-site/privacy.html
```

**Keywords** (max 100, no spaces after commas):
```
chess,coach,learn,tactics,puzzles,kids,training,beginner,strategy,board,lessons,endgame,openings
```

| Field | Value |
|---|---|
| Support URL | `https://k00r0.github.io/kings-counsel-chess-site` |
| Marketing URL | `https://k00r0.github.io/kings-counsel-chess-site` |
| Version | `1.0.0` |
| Copyright | `2026 ⟨NAME⟩` |
| Routing App Coverage File | none |

### 5c. Build
Under **Build**, click **+** and select the newest build uploaded by Codemagic (it appears 10–30 minutes after upload).
- Export compliance: if asked, choose **None of the algorithms mentioned** (standard HTTPS only). The build already declares no non-exempt encryption, so the question normally doesn't appear.
- **If no build is listed, stop and tell the human.** The build comes from their Codemagic workflow "iOS → TestFlight".

### 5d. In-App Purchases and Subscriptions
On this version page, in **In-App Purchases and Subscriptions**, add all three:
- `com.djtattva.kingscounsel.pro.monthly`
- `com.djtattva.kingscounsel.pro.yearly`
- `com.djtattva.kingscounsel.pro.lifetime`

First-time purchases must be submitted together with the app version, or Apple reviews the app without them.

### 5e. Game Center
Off.

### 5f. App Review Information

| Field | Value |
|---|---|
| Sign-in required | **No** |
| Contact first and last name | ⟨ASK: NAME⟩ |
| Contact phone | ⟨ASK: PHONE⟩ |
| Contact email | `sagarika125@gmail.com` |
| Attachment | none |

**Notes:**
```
No login is needed. The first screens ask who is playing (age band, used to pick the coach and keep ads age-appropriate) and an optional first name. Everything is stored only on the device.

HOW TO SEE THE MAIN FEATURE: choose "18 or older" and "I play sometimes", then tap "Play with the coach" and start a game. Play 1.e4, then move your light-squared bishop to a6 (f1-a6), where a pawn can capture it. The coach pauses the game and offers "Take it back / Show me / Play on".

CHESS ENGINE: Stockfish runs inside the app (WebAssembly, in the app bundle), fully offline. The app never downloads executable code.

AI COACH QUESTIONS (13+ only): players aged 13+ can type a chess question during a game. The question, the board position and engine facts are sent to our server (Cloudflare), which uses an AI model (Groq / Cloudflare Workers AI) to answer in one to three sentences about chess only. Nothing is stored. Players under 13 never see this feature; their coach is fully offline. Daily limits apply.

ADS: Google AdMob, never shown during a game. Users under 13 get child-directed treatment; users 13–17 get non-personalized ads; neither group sees the App Tracking Transparency prompt. Adults see Google's consent form where required, then the ATT prompt.

PURCHASES: King's Counsel Pro (monthly, yearly with a 1-week trial, or lifetime) removes ads and adds unlimited take-backs, more typed questions and a premium voice. Open it from the Home tab ("Go Pro") or the Me tab ("See Pro"). Restore Purchases is on the same screen and in the Me tab.
```

### 5g. Version Release
**Manually release this version.** The human decides when to release.

## 6. App Privacy (left menu → App Privacy)

**Privacy Policy URL:** `https://k00r0.github.io/kings-counsel-chess-site/privacy.html`

"Do you or your third-party partners collect data from this app?" Choose **Yes**.

Declare exactly these data types:

| Data type | Purposes | Linked to the user's identity? | Used for tracking? |
|---|---|---|---|
| Identifiers → Device ID | Third-Party Advertising, Analytics, App Functionality | No | **Yes** |
| Location → Coarse Location | Third-Party Advertising, Analytics | No | No |
| Usage Data → Product Interaction | Third-Party Advertising, Analytics | No | **Yes** |
| Usage Data → Advertising Data | Third-Party Advertising, Analytics | No | **Yes** |
| User Content → Other User Content | App Functionality | No | No |
| Diagnostics → Crash Data | App Functionality, Analytics | No | No |
| Diagnostics → Performance Data | App Functionality, Analytics | No | No |
| Diagnostics → Other Diagnostic Data | App Functionality, Analytics | No | No |

- "Other User Content" covers the chess questions players type to the coach. They're sent to answer the question and not stored.
- "App Functionality" on Device ID covers a random install code the app sends with those questions, used only to limit how many each device can ask.

Do **not** declare names, emails, purchases, contacts, precise location, audio, or browsing history. If Google's official list at https://developers.google.com/admob/ios/privacy/data-disclosure differs for the AdMob rows, follow Google's list.

Publish the privacy answers.

## 7. Age Rating questionnaire

| Section | Answer |
|---|---|
| In-app controls: Parental Controls | No |
| In-app controls: Age Assurance | No (the age question is self-declared, not verified) |
| Capabilities: Unrestricted Web Access | No |
| Capabilities: User-Generated Content | No (typed questions go only to the coach and are never shown to other users) |
| Capabilities: Messaging and Chat | No |
| Capabilities: Advertising | **Yes** |
| Capabilities: Social media | No |
| Capabilities: AI assistant / chatbot (if asked) | **Yes**: an AI chess coach answers typed chess questions for players 13+, limited to chess topics |
| Every content question (violence, horror, profanity, mature themes, medical, alcohol/drugs, gambling, contests, loot boxes, sexual content) | None / No |
| Age category | **Not Applicable** (do **not** select Made for Kids) |
| Age suitability URL | leave empty |

Expected result: **4+** (it may come out higher because of the AI question). Report the result to the human; don't change answers to lower it.

## 8. Accessibility (if asked for "Accessibility Nutrition Labels")
Optional. Answer only:
- Dark Interface: **Yes**
- Leave everything else unanswered.

## 9. EU Digital Services Act trader status
Location: **Business** (or Account) → **Digital Services Act**. Ask the human ⟨ASK: TRADER⟩:
- An app that earns money (ads, subscriptions) is normally a **trader**. Apple then shows the given address, phone and email on the EU App Store page.
- If the human doesn't want that published, they can remove EU countries from availability (section 3) instead.

Do not guess this one.

## 10. Final check, then hand back to the human

Confirm all of these:
- [ ] 8 iPhone + 6 iPad screenshots uploaded in order
- [ ] Description, promotional text, keywords, support/marketing/privacy URLs filled in
- [ ] Build attached
- [ ] 3 purchase products created, each with the review screenshot, and attached to the version
- [ ] App Privacy published
- [ ] Age rating done (report the result)
- [ ] App Review contact and notes filled in
- [ ] Release = manual

Then tell the human it's ready and **ask them to press "Add for Review" → "Submit for Review" themselves**, or get their explicit OK first.
