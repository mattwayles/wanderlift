## Track: 50b — App Store review prompt
Last updated: 2026-10-24

### Done
- [x] Migration 0041 (users.review_prompt_last_asked_date / _version), schema, usersRepo, round-trip test
- [x] `expo-store-review ~57.0.3` added to app/package.json (NEW DEPENDENCY, NEW NATIVE MODULE — needs a
  fresh dev-client / EAS build before it works on device; lazy-loaded so Jest and old builds degrade safely)
- [x] `app/src/lib/reviewPrompt.ts` (pure `shouldAskForReview` + `maybeRequestReview`) with tests
- [x] Wired into SummaryScreen "Heck yes!" (completion view only) + `SummaryScreen.reviewPrompt.test.tsx`

### In progress
- none. Track complete; owed: device pass after a native rebuild (sheet only shows on a TestFlight/App
  Store build; in dev builds Apple's sheet is shown but never submits).

### Next
- none

### Decisions / gotchas
- Eligible: (completed workouts >= 3 OR level-up this session) AND version != last-asked version AND
  (never asked OR >= 120 days since last-asked local_date). Local dates only (invariant 6).
- App version from `appInfo.appVersion()` (expo-application, already a dependency).
- The ask is recorded just before `requestReview()`, so a thrown sheet still never re-nags.
- No pre-prompt dialog; Apple's sheet only. Fire and forget, errors swallowed.
- Worktree had no node_modules; ran `npm ci` at the worktree root.
