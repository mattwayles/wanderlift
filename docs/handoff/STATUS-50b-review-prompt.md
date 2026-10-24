## Track: 50b — App Store review prompt
Last updated: 2026-10-23

### Done
- (none yet)

### In progress
- Increment 1: migration 0041 (users.review_prompt_last_asked_date, review_prompt_last_asked_version),
  schema.ts, usersRepo accessors + round-trip test.

### Next
- 2: `expo-store-review` dependency (`npx expo install expo-store-review` from app/; NEW NATIVE MODULE,
  needs a fresh dev-client build) + `app/src/lib/reviewPrompt.ts` (pure `shouldAskForReview` + lazy-loaded
  `maybeRequestReview`) with unit tests.
- 3: wire into SummaryScreen "Heck yes!" press handler (completion view only) + SummaryScreen test.

### Decisions / gotchas
- Eligible: (completed workouts >= 3 OR level-up this session) AND version != last-asked version AND
  (never asked OR >= 120 days since last-asked local_date). Local dates only (invariant 6).
- No pre-prompt dialog; Apple's sheet only. Fire and forget, errors swallowed.
- Worktree had no node_modules; ran `npm ci` at the worktree root.
