## Track: 51a — "Where are you starting?" engine + store (no UI)
Last updated: 2026-10-24
### Done
- [x] Fast-forwarded the worktree to master (needed migration 0041 as the base).
### In progress
- Increment 1: engine `StartingPoint` + `startingLevelFor` in
  `packages/engine/src/progression/startingPoint.ts`, exported from the engine index, with the
  exhaustive climbability tests.
### Next
- Increment 2: migration 0042 (`users.starting_point`), schema, usersRepo read/patch, test.
- Increment 3: store `applyStartingPoint` in `packages/store/src/startingPoint.ts` + tests.
- Increment 4: `app/src/lib/startingPoint.ts` labels/descriptions (plain data, no UI).
### Decisions / gotchas
- index = floor(fraction * (n-1)), clamped to [0, n-3]. restarting === baseStartLevel.
- Skip any family with logged performance (session entries) or non-zero streaks.
- No new signal types; level changes from the progression board log signals, but a starting
  point is not a correction, so applyStartingPoint logs none.
