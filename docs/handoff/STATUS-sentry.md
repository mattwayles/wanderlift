## Track: sentry — crash reporting + tracing (Sentry)
Last updated: 2026-10-24
### Done
- [x] App Privacy label published in App Store Connect (user, 2026-10-24); privacy + terms pushed to `gh-pages`
- [x] SDK installed, init, boundary reporting, tests — fdd74f5 (new dependency `@sentry/react-native` ~7.11.0)
- [x] Real event verified from the dev client: WANDERLIFT-1 (resolved); temporary throw never committed
- [x] Sentry project `wanderlift` created in org `matt-wayles` (react-native). DSN is public-safe (ingest-only).
### In progress
- none
### Next
- Confirm a production EAS build uploads source maps/dSYMs (`SENTRY_AUTH_TOKEN` is set as an EAS production secret).
- Decide on Sentry project setting "Prevent Storing of IP Addresses" (see gotchas).
- Enable GitHub Pages (gh-pages, root) so `site/` is live, and enter the privacy/terms URLs in App Store Connect.
- When analytics or paid features land: update `site/privacy.html` and the App Privacy label.
### Decisions / gotchas
- Errors + tracing only. `sendDefaultPii: false`, NO Session Replay / screenshots (workout + Passport location data),
  no console breadcrumbs (could carry city names). Off in `__DEV__` unless `EXPO_PUBLIC_SENTRY_DEV=1`.
- Local error capture (`lib/errorCapture.ts`) stays; it still feeds "Share error details".
- Never commit `SENTRY_AUTH_TOKEN`.
- Verified events carry `user.geo` (city, from IP, server-side) and an `app.device` hash tag even with sendDefaultPii off;
  site/privacy.html says so. Project setting "Prevent Storing of IP Addresses" would drop the geo — owner's call.
