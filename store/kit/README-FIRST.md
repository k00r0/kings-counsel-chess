# King's Counsel Chess: store submission kit

Give your AI agent this folder:
- `AGENT-BRIEF-APPSTORE.md`: App Store Connect, step by step
- `AGENT-BRIEF-GOOGLEPLAY.md`: Google Play Console, step by step
- `DESCRIPTION.txt`: the store description (both stores)
- `screenshots/`: iPhone, iPad and Android screenshots, the Play icon and feature graphic, and the paywall review screenshot

## Three things only you can do first

1. **Real AdMob ids.** The app still runs Google's *test* ads. In AdMob create 2 apps (iOS + Android) with Banner, Interstitial and Rewarded units, and send the 8 ids to Claude. Claude switches the app to live ads and rebuilds. Submitting with test ads works, but earns nothing.
2. **Builds from Codemagic.**
   - iOS: run "iOS → TestFlight". Its build appears in App Store Connect.
   - Android: create a keystore named `kings_counsel_keystore` in Codemagic (keep a backup forever), then run "Android → App Bundle" and download the `.aab`.
3. **Google Play account.** One-time $25. If it's a personal account made after Nov 2023, Google requires 12 testers for 14 days before the public launch.

The agent stops and asks you before agreements, bank details, signing keys, and pressing Submit.
