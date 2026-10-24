## Track: accessibility — Dynamic Type + VoiceOver pass on the workout loop
Last updated: 2026-10-24

### Done
- [x] Survey (no code): see "Findings" below.
- [x] Increment 1+2 (committed together, sha in `git log`): Toast announces on iOS; `ProgressRing`
  `accessibilityValueText`; elapsed-clock label; timed-circle and rest-ring spoken seconds; set and
  rest announcements; `completeButton` `minHeight`. Tests: `ui/a11y.test.tsx`,
  `WorkoutScreen.accessibility.test.tsx`.

### In progress
- Nothing. Pick up from Next.

### Next
- Still fixed in WorkoutScreen: `repCountInput` height 124 (text capped at 1.3x), `ringNumeral`
  width 170 and the ring/duration-button geometry (rings are fixed-size by design; numerals are fitted
  and capped). Check on a device at AX5 before changing.
- App-wide Dynamic Type sweep outside the workout loop (fixed `height`/`width` styles, `numberOfLines={1}`
  on labels) — park in docs/BACKLOG.md once the workout loop lands.
- `PassportScreen.tsx:317` has the same iOS-ignored `accessibilityLiveRegion`.
- On-device VoiceOver run-through and AX5 screenshots of Workout (rep set, timed hold, rest). Nothing
  here has been verified on a device; jest only covers the props.

### Decisions / gotchas
- `Txt` already scales with Dynamic Type (it reads `fontScale`); the clipping risk is fixed-size
  containers, not unscaled text.
- `Button` already uses `minHeight`; a caller-supplied `height` in `style` defeats it.
- iOS-only app: `accessibilityLiveRegion` is Android-only, so use `announceForAccessibility`.
- Do not announce every rest tick; the audio/haptic 3-2-1 cues already exist. Announce the rest
  start and the next set only.

### Findings (survey)
- Fixed sizes in WorkoutScreen styles: `completeButton` height 72, `repCountInput` height 124,
  `ringNumeral` width 170, `barSide` width 80, `durationMinus/Plus` absolute at -28.
- Timed ring button label is static ("Pause the hold"); remaining time is not exposed.
- Rest `ProgressRing` has no label; value is a percentage, not seconds.
- No phase-change announcements anywhere in the workout loop.
