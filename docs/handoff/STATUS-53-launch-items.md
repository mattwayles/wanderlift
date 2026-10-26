## Track: 53 — launch items (policy links, data export/delete, demo tile, flaky tests)
Last updated: 2026-10-26
### Done
- [x] Flaky tests, second layer: under a second concurrent jest run (the repo is often worked in by
  two sessions) tests stalled 25-150s. `testTimeout` 60s and `jest.retryTimes(1)` in
  `jest.setupAfterEnv.js`. `npm run check` green 2 of 2 after, one of them at load average ~12.
- [x] Flaky screen tests: root cause was fsync per commit on a loaded disk (sys time > user time);
  `PRAGMA synchronous = OFF` under Jest only. Heavy screen suites 29s -> 12s.
- [x] Deleted stale `app/roamfit-test-*.sqlite*` (gitignored litter).
- [x] Settings: Legal group (Privacy Policy, Terms of Use), Your data group (Export my data via share
  sheet; Delete all data behind a confirm Sheet). `userDataRepo` in packages/store; `StoreContext.restart()`.
- [x] `HowToDemo`: dashed tile removed; Watch a demo (online) + one plain note line. Verdict: cannot be
  confirmed publishable with the tile (2.1(a) placeholder wording), so replaced.
- [x] Unused files removed: `docs/handoff/wave-*.md` (spec scaffolding), unreferenced `app/assets`
  android-icon-*.png and favicon.png (iOS-only app), `react-native-webview` dependency + jest mock
  (removal only; native pod drops at next build). No orphan source modules found.
### In progress
- Nothing; track complete.
### Next
4. Remove unused files; BACKLOG tidy; full `npm run check`.
### Decisions / gotchas
- Working tree already had uncommitted engine changes (golden snapshot, difficultyTable,
  prescribe.test) from before this track; they are not part of it. Never `git add -A`.
- No new dependencies: export uses RN `Share` with JSON text (no file-system/sharing module).
- iCloud copy cannot be deleted from the app (native module has no delete); the delete sheet says so.
