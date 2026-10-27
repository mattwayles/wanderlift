## Track: live-activity — Active workout on the Dynamic Island / Lock Screen (display only)
Last updated: 2026-10-27
### Done
- [x] Step 1: local Expo module `app/modules/workout-live-activity/` (Swift start/update/end,
  optional native lookup, Jest fake) + controller `app/src/lib/workoutLiveActivity.ts` with tests
  (see commit "Live Activity: native module and controller")
### In progress
1. Widget extension `app/targets/workout-activity/` via `@bacons/apple-targets` (new dependency),
   SwiftUI views for compact / minimal / expanded Island and the Lock Screen banner;
   `NSSupportsLiveActivities` in `app.json`.
### Next
2. Wire it: WorkoutScreen pushes the base state (exercise, set, elapsed, pause); RestView reports
   the rest end instant at the same points it schedules the rest notification; end on Summary's
   completeSession and both abandon paths; root reconcile on launch/foreground ends activities
   whose session is no longer active.
3. BACKLOG: device pass owed.
### Decisions / gotchas
- Display only: no buttons in the Island (no LiveActivityIntent). Fully local updates, no push
  token, no APNs (no backend — CLAUDE.md).
- The clocks run system-side: `Text(timerInterval:)` for elapsed and rest. The app only sends an
  update when something changes (set, phase, pause, swap, rest ±15s), never per second.
- Elapsed clock anchor = now − activeElapsedSec (absorbs pausedTotalSec). Paused → a frozen
  number, no ticking timer.
- Rest end instant lives only in RestView's local countdown (±15s isn't persisted), so RestView
  reports it; the session row only says *whether* we are resting.
- Rest keeps counting during a workout pause (existing behaviour) — the Island mirrors that.
- The ActivityAttributes struct is duplicated in the module and the widget target (ActivityKit
  matches by type); a Jest test keeps the two copies identical.
- Every native call is best-effort and never throws into the workout (same rule as
  workoutNotifications.ts). Live Activities off / unsupported → silent no-op.
- iOS deployment target is 16.4, so ActivityContent (16.2) needs no availability guards.
