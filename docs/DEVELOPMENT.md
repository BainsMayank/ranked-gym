# Testing without login

Hosted/local backend commands and the remaining Phase 7 implementation gaps are documented in
[BACKEND_SETUP.md](BACKEND_SETUP.md).

Development builds open directly into the app after restoring any saved session. Login, sign-up
and onboarding are skipped on every launch, including after the emulator's app data is cleared.
This is enabled by default; no `.env` change is needed.

If an account is already signed in, its session and server data continue to work. Otherwise the app
uses its existing account-free preview mode with local data and preview fallbacks. Features that
require an authenticated server account (profile changes, synced ranks and leagues) still require
a real sign-in. The bypass does not create an account or mark a server profile as onboarded.

The exercise library also needs a real sign-in for its first download. On a fresh install in
account-free preview, **Add exercises** is empty: library sync is disabled without a user, and
the backend denies anonymous library reads. The “Connect once” / “Try again” message does not
explain this sign-in requirement. Use the authentication override below, sign in and let the
library download; the official exercises then stay cached on this device for offline use and
later preview sessions. Clearing app data removes that cache.

To test authentication or onboarding, add `EXPO_PUBLIC_DEV_AUTH_BYPASS=false` to `.env` and restart
Expo, or launch it with:

```sh
EXPO_PUBLIC_DEV_AUTH_BYPASS=false pnpm start
```

Remove the override or set it to `true` and restart Expo to enable the bypass again. Release builds
always require normal authentication and onboarding, regardless of this setting.

Home For You is available without an account. Its metrics use workouts actually saved on this
phone (empty until you log one); goals, weigh-ins and recovery speed persist locally. Preview
mode cannot validate ranks or publish to a feed. It does not create a fake signed-in account.

If Expo Go shows `Cannot find native module 'ExpoAsset'` after dependency changes, stop and restart
this project's Expo server, then reopen the active development server in Expo Go. A clean
`pnpm start --clear` is safe; do not reset the database or erase the simulator to fix bundler state.
Native Expo Go reload crashes were also observed during this session; see PROGRESS.md for the
verified launch and remaining runtime checks.
