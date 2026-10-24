## Track: sentry — crash reporting + tracing (Sentry)
Last updated: 2026-10-24
### Done
- [x] Sentry project `wanderlift` created in org `matt-wayles` (react-native). DSN is public-safe (ingest-only).
### In progress
- none (verified 2026-10-24: WANDERLIFT-1 from the dev client; temporary throw removed, never committed)
- Install `@sentry/react-native` (new dependency, via `npx expo install` in `app/`), `app/metro.config.js`
  (`getSentryExpoConfig`), `@sentry/react-native/expo` plugin in `app/app.json`, `app/src/lib/sentry.ts`
  (init + scrubbing + `reportError`), wire into `index.ts`, `App.tsx` (`Sentry.wrap`) and `AppErrorBoundary`.
### Next
- EAS: `SENTRY_AUTH_TOKEN` secret + `EXPO_PUBLIC_SENTRY_DSN` env for production builds so source maps/dSYMs upload.
- Privacy: App Privacy "Crash data / Diagnostics, not linked"; hosted privacy policy must mention crash reports.
- Remove the "Sentry" item from BACKLOG item "Crash reporting and analytics — the rest" once verified.
### Decisions / gotchas
- Errors + tracing only. `sendDefaultPii: false`, NO Session Replay / screenshots (workout + Passport location data),
  no console breadcrumbs (could carry city names). Off in `__DEV__` unless `EXPO_PUBLIC_SENTRY_DEV=1`.
- Local error capture (`lib/errorCapture.ts`) stays; it still feeds "Share error details".
- Never commit `SENTRY_AUTH_TOKEN`.
- Verified events carry `user.geo` (city, from IP, server-side) and an `app.device` hash tag even with sendDefaultPii off;
  site/privacy.html says so. Project setting "Prevent Storing of IP Addresses" would drop the geo — owner's call.
