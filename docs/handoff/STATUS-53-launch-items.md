## Track: 53 — launch items (policy links, data export/delete, demo tile, flaky tests)
Last updated: 2026-10-26
### Done
- [x] Flaky screen tests: root cause was fsync per commit on a loaded disk (sys time > user time);
  `PRAGMA synchronous = OFF` under Jest only. Heavy screen suites 29s -> 12s.
- [x] Deleted stale `app/roamfit-test-*.sqlite*` (gitignored litter).
- [x] Settings: Legal group (Privacy Policy, Terms of Use), Your data group (Export my data via share
  sheet; Delete all data behind a confirm Sheet). `userDataRepo` in packages/store; `StoreContext.restart()`.
### In progress
- `HowToDemo` replacement.
### Next
3. `HowToDemo`: replace the dashed "coming soon" placeholder tile (App Review 2.1(a) risk).
4. Remove unused files; BACKLOG tidy; full `npm run check`.
### Decisions / gotchas
- Working tree already had uncommitted engine changes (golden snapshot, difficultyTable,
  prescribe.test) from before this track; they are not part of it. Never `git add -A`.
- No new dependencies: export uses RN `Share` with JSON text (no file-system/sharing module).
- iCloud copy cannot be deleted from the app (native module has no delete); the delete sheet says so.
