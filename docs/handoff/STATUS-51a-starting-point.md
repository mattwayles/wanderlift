## Track: 51a — "Where are you starting?" engine + store (no UI)
Last updated: 2026-10-24
### Done
- [x] Worktree fast-forwarded to master (migration 0041 base).
- [x] Engine `StartingPoint`, `STARTING_POINTS`, `isStartingPoint`, `startingLevelFor`, tests (4a8f6ed).
- [x] Migration 0042 `users.starting_point`, schema, usersRepo (074e0ce).
- [x] Store `applyStartingPoint` + tests; app `lib/startingPoint.ts` copy (this commit).
### In progress
- Nothing. Track complete; ready to merge.
### Next
- 51c wires the picker: call `applyStartingPoint(db, point, familyLibrary, exerciseLibrary.exercises, now)`.
### Decisions / gotchas
- index = floor(fraction * (n-1)), clamped to [0, n-3]. restarting === baseStartLevel.
- History = completed session with a completed set on the family, or a live hit/miss streak. Such
  families are skipped and reported in `skippedWithHistory`.
- No signals logged: a starting point is not a rung correction. No new signal types.
- Applying re-seeds `micro` fresh and zeroes streaks; keeps `lastLevelChangeAt`.
- Rows are created if absent, so it works before or after the first dashboard read.
