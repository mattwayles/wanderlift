## Track: 53 — launch items (policy links, data export/delete, demo tile, flaky tests)
Last updated: 2026-10-26
### Done
- [x] Flaky screen tests: root cause was fsync per commit on a loaded disk (sys time > user time);
  `PRAGMA synchronous = OFF` under Jest only. Heavy screen suites 29s -> 12s.
- [x] Deleted stale `app/roamfit-test-*.sqlite*` (gitignored litter).
### In progress
- Legal links in Settings (Privacy Policy, Terms of Use rows opening the hosted pages).
### Next
1. Store: `exportAllUserData` / `deleteAllUserData` in packages/store (+ tests).
2. Settings: "Export my data" (share sheet, JSON text) and "Delete all data" (confirm sheet), wiring
   cancels notifications and remounts via `replaceDb`.
3. `HowToDemo`: replace the dashed "coming soon" placeholder tile (App Review 2.1(a) risk).
4. Remove unused files; BACKLOG tidy; full `npm run check`.
### Decisions / gotchas
- Working tree already had uncommitted engine changes (golden snapshot, difficultyTable,
  prescribe.test) from before this track; they are not part of it. Never `git add -A`.
- No new dependencies: export uses RN `Share` with JSON text (no file-system/sharing module).
- iCloud copy cannot be deleted from the app (native module has no delete); the delete sheet says so.
