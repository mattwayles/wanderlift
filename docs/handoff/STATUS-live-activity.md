## Track: live-activity — Active workout on the Dynamic Island / Lock Screen (display only)
Last updated: 2026-10-27
### Done
- [x] Step 1: local Expo module `app/modules/workout-live-activity/` (Swift start/update/end,
  optional native lookup, Jest fake) + controller `app/src/lib/workoutLiveActivity.ts` (724dde6)
- [x] Step 2: widget extension `app/targets/workout-activity/` via `@bacons/apple-targets` 5.0.0
  (new dependency): compact / minimal / expanded Island + Lock Screen banner;
  `NSSupportsLiveActivities` in `app.json`. Prebuild + Simulator build of the whole app verified
  (BUILD SUCCEEDED, `WorkoutActivity.appex` embedded). Commit "Live Activity: widget target".
- [x] Step 3: wired. WorkoutScreen effect → `showWorkout`; RestPhase → `setRestWindow` (mount,
  ±15s, Skip, unmount); `endWorkoutActivity` on Summary finish and both abandons;
  `useLiveActivityReconcile` in App on launch/foreground. Commit "Live Activity: wired".
### In progress
- (none — track complete pending the device pass)
### Next
- Device pass: see the BACKLOG item "Workout Live Activity — device pass owed".
### Decisions / gotchas
- Display only: no buttons in the Island (no LiveActivityIntent). Fully local updates, no push
  token, no APNs (no backend — CLAUDE.md).
- The clocks run system-side: `Text(timerInterval:)` for elapsed and rest. The app only sends an
  update when something changes (set, phase, pause, swap, rest ±15s), never per second.
- Elapsed anchor = startedAt + pausedTotalSec, read from the row and never from now, so an
  unchanged render dedupes to nothing. Paused → frozen number, no ticking timer.
- Rest end instant lives only in RestView's local countdown (±15s isn't persisted), so RestView
  reports it. Rest keeps counting during a workout pause (existing behaviour); the Island mirrors it.
- The ActivityAttributes struct is duplicated in the module and the widget target (ActivityKit
  matches by type); `liveActivityAttributes.test.ts` keeps the copies identical and the JS state
  fields in step with the Swift record.
- The native module is looked up with `requireOptionalNativeModule`: an old dev client without it
  runs the workout with every call a no-op.
- `endWorkoutActivity(sessionId)` remembers the session so a late render of the abandoned screen
  can't re-show it.
- SourceKit flags the Swift files standalone (macOS availability, missing types) — spurious; the
  real Xcode build is clean.
- Full `npm run check` while xcodebuild runs can time out two slow screen suites (goHome,
  Journey pastMonths); both pass without the contention.
