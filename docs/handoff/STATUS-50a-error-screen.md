## Track: 50a — root error screen + local error capture
Last updated: 2026-10-24
### Done
- [x] errorCapture.ts ring buffer + global handler (index.ts), AppErrorBoundary mounted outermost in App.tsx, tests (see git log)
### In progress
- none
### Next
- Device pass: force a render throw and confirm the fallback in Midnight and Daybreak, large text, and the share sheet.
### Decisions / gotchas
- Boundary sits OUTSIDE SafeAreaProvider/StoreProvider/ThemeProvider so a throw in any of them still shows
  the fallback; fallback uses themeFor(Appearance) colors and its own SafeAreaProvider (with zero initialMetrics so it renders at once).
- Version comes from lib/appInfo (expo-application); expo-constants is not a dependency. Share.share only; nothing leaves the device unprompted.
- No migration, no packages/store changes (migration 0041 is another agent's).
- React retries a failed render once, so a test child must throw twice to reach the boundary.
