## Track: watch-app — Apple Watch companion (start / track / stop a workout from the wrist)
Last updated: 2026-10-30
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
- [x] Step 5-6: watch target `app/targets/watch` (SwiftUI, watchOS 10): `WatchProtocol.swift`,
  `PhoneLink` (WCSession), `HealthWorkout` (HKWorkoutSession + live heart rate, saves the
  workout), `WatchWorkoutModel` (follows the phone, sends commands), views (Ready, set with crown
  reps or a hold countdown, rest with ±15s/Skip and the difficulty question, controls, Done).
  Config plugin links it; the phone's pod is `WanderliftWatch` (a pod named WatchConnectivity
  shadows Apple's framework). `watchProtocol.test.ts` keeps the TS and Swift fields in step.
  Verified: prebuild; `Watch` target builds for the watchOS Simulator SDK; the phone pod builds.
### In progress
Follow-up round 2026-10-29 (user feedback, three increments, commit each):
1. [done] Rest feedback: `skipFeedback` + `neverAgain` commands (phone handlers already exist:
   `handleFeedbackPromptAnswer(null)`, `handleNeverAgain`); `WatchFeedback.neverAgainDone`; watch
   buttons Skip / Never again; button text colours fixed (Palette.onAccent was near-black on
   dark tints; use white-ish on the dark fills).
2. [done] Holds: the PHONE runs the hold timer (so its 3-2-1 beeps reach the user's headphones, same as a
   phone-driven workout); watch mirrors it (`WatchActive.hold`) and sends `startHold` /
   `adjustHold` (crown, 5s steps, only before start). Replaces the watch-run countdown.
3. [done] Watch cues (`targets/watch/WatchCues.swift`): 3-2-1 + end taps scheduled as local notifications (fire with the display off) and
   in-process haptics only when the app is frontmost, so there is never a double.
### Done (2026-10-30): heart rate on the phone's Workout screen
Watch sends each new HR as a LIVE-ONLY message (`heartRate`, `hrAt`; dropped when out of range, never
queued, never on disk) -> native `onHeartRate` event -> `useWatchHeartRate()` (stale after 20s) ->
a badge in the top-right of the set's header row (`ExerciseHeader`). Not stored anywhere; the phone
still never reads Health. Needs a dev-client rebuild (native module gained the `onHeartRate` event;
only parse-checked here, the pods are not installed locally).
### Next
- (round 2026-10-29 done; its device pass is in BACKLOG)
- Device pass (BACKLOG "Apple Watch companion app"). Not verified here: the full app scheme (it
  needs the watchOS 26.5 platform runtime installed to embed the watch app), any of it on
  hardware, and the EAS signing of the new `com.mattwayles.wanderlift.watchkitapp` target with
  HealthKit.
### Decisions / gotchas
- Phone is authoritative. Watch only mirrors state and sends commands; every command is applied
  through the same handlers the Workout screen's own buttons use (`handleWatchCommand`).
- Commands carry the `setKey` ("entryId:setIndex") the watch saw, so a late or repeated command
  for a set the phone already left is ignored. Command ids de-dupe redelivery (native side).
- "Stop" on the watch ends the HealthKit workout and sends the phone to Summary; FINISH (the one
  call to completeSession) stays on the phone. Abandon (destructive) is phone-only.
- Start from the watch starts the pending *planned* session (the one Approval shows) with
  `startSession` and opens the Workout screen. No generation on the watch (engine is TS).
- Health: the watch records and saves the workout; it sends `end { healthSaved }` and the phone
  remembers it (native flag `health:<sessionId>`), so `completeSession(healthSavedByWatch)` skips
  the phone's estimated `healthkit_write`. The watch also saves if the phone leaves the workout
  for more than 20s without a stop (a discarded workout is then saved too; accepted).
- Heart rate is read from the workout's own live builder only; no history query. The phone app
  still never reads Health (healthKit.ts header says where the exception lives).
- Rest: the phone's `RestPhase` owns the countdown; `restControlsRef` lets a command move it.
- New dependencies: none (the apple-targets plugin was already in). New native module
  `modules/watch-connectivity`; new target `targets/watch`.
- A watch message while the app is not running relaunches it in the background with no JS: the
  command is on disk (WatchLink) and JS drains it on foreground / `onWake`. Unverified on device.
- Holds are phone-run (round 2026-10-29): the watch no longer runs its own countdown, because only
  the phone is wired to the user's headphones and already has the 3-2-1 / halfway / switch cues.
  `WatchHold` carries phase, side, length and the phase's end instant (frozen `remainingSec` while
  paused). Crown steps are relative `adjustHold` commands; the phone clamps at 5s.
- Watch cues are doubled on purpose: a local notification (delivered with the display off) plus an
  in-app haptic that plays only if `WKApplication.applicationState == .active`; `willPresent`
  suppresses the notification in that same state, so exactly one sounds. Not verifiable off a
  device. No new dependencies; one new file (`WatchCues.swift`), notification permission asked on
  the first countdown.
- Watch buttons use `FilledButtonStyle` (solid fill + chosen ink), not `.tint`: on watchOS `.tint`
  paints a dim translucent plate, which is what made the dark text unreadable.
- Now Playing: the workout's third page is SwiftUI `NowPlayingView` (system, no SDK, no sign-in). It
  controls whatever is the active Now Playing app, Spotify included, like Apple's Workout app.
