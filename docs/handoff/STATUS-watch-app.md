## Track: watch-app — Apple Watch companion (start / track / stop a workout from the wrist)
Last updated: 2026-10-28
Plan: BACKLOG "Apple Watch companion app". Decisions from the user: heart rate on screen; training
with the phone out of range is NOT required (a later phase); Quick Session stays phone-only; the
Dynamic Island going stale while the watch drives a locked phone is accepted.
### Done
- [x] Steps 1-4 on the phone: protocol (`app/src/lib/watchProtocol.ts`), native module
  `app/modules/watch-connectivity` (WCSession pipe, disk queue, flags), controller
  `app/src/lib/workoutWatch.ts`, `WatchBridge` in WorkoutScreen (state out, commands in through the
  screen's own handlers), `useWatchHost` in App (ready state, Start, drain), `completeSession`
  `healthSavedByWatch`. Jest drives the whole flow against the native fake. Commit "Watch app: the
  phone side".
### In progress
- Step 5: the watch target `app/targets/watch` (SwiftUI) and the Swift copy of the protocol
### Next
(2-4 are done, kept for reference)
2. Native module `app/modules/watch-connectivity` (generic WCSession pipe: JSON strings in/out,
   native disk queue for commands that arrive while JS is not listening, de-dupe by command id).
3. `app/src/lib/workoutWatch.ts` controller (state to the watch, deduped) + `useWatchCommands` in
   WorkoutScreen + a host in App for Start-from-watch when no Workout screen is mounted.
4. HealthKit: `completeSession` option to skip the phone's `healthkit_write` when the watch saved
   the workout; update `lib/healthKit.ts` header (live-workout read exception).
5. Watch target `app/targets/watch` (SwiftUI): state model, WCSession, HKWorkoutSession + live
   heart rate, views (Ready / Set / Rest / Paused / Done), haptics.
6. app.json / entitlements / usage strings; prebuild + xcodebuild of the watch scheme.
7. BACKLOG: replace the plan item with what is left (device pass, phone-free phase).
### Decisions / gotchas
- Phone is authoritative. Watch only mirrors state and sends commands; every command is applied
  through the same handlers the Workout screen's own buttons use.
- Commands carry the `setKey` ("entryId:setIndex") the watch saw, so a late or repeated command
  for a set the phone already left is ignored. Command ids de-dupe redelivery.
- "Stop" on the watch ends the HealthKit workout and sends the phone to Summary; FINISH (the one
  call to completeSession) stays on the phone. Abandon (destructive) is phone-only.
- Start from the watch starts the pending *planned* session (the one Approval shows). No
  generation on the watch (engine is TS, phone-only).
