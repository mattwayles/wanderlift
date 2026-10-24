## Track: 50a — root error screen + local error capture
Last updated: 2026-10-23
### Done
- (none yet)
### In progress
- Writing app/src/lib/errorCapture.ts (ring buffer + ErrorUtils global handler, installed from app/index.ts),
  app/src/components/AppErrorBoundary.tsx (outermost in App.tsx, own SafeAreaProvider, no context deps),
  tests beside each.
### Next
- Commit, run npm run check.
### Decisions / gotchas
- Boundary sits OUTSIDE SafeAreaProvider/StoreProvider/ThemeProvider so a throw in any of them still shows
  the fallback; fallback uses themeFor(Appearance) colors and its own SafeAreaProvider.
- Version comes from lib/appInfo (expo-application), not expo-constants. Share.share only; nothing leaves the device unprompted.
- No migration, no packages/store changes (migration 0041 is another agent's).
