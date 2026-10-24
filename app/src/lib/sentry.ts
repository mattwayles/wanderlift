/**
 * Crash reporting. Errors + tracing only: no Session Replay or screenshots (workout and Passport
 * location data), no default PII, no console breadcrumbs. Off in dev unless
 * `EXPO_PUBLIC_SENTRY_DEV=1`. Everything else in the app talks to `reportError`, never to the SDK.
 */
import * as Sentry from '@sentry/react-native';

// Public by design: a DSN can only send events into this project.
const DSN =
  'https://0672fd42511a157a9626665cd0274c53@o4512312321835008.ingest.us.sentry.io/4512312337694720';

const enabled = !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEV === '1';

export function initSentry(): void {
  if (!enabled) return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? DSN,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    beforeBreadcrumb: (crumb) => (crumb.category === 'console' ? null : crumb),
    beforeSend: (event) => {
      // Nothing about the person: location and identity stay on the device.
      delete event.user;
      return event;
    },
  });
}

/** The root component wrapped for React render errors and touch breadcrumbs. */
export const wrapRoot = Sentry.wrap;

/** Send a caught error. Never throws, so reporting can't mask the original failure. */
export function reportError(error: unknown, extra?: { componentStack?: string | null }): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error, extra?.componentStack ? { extra } : undefined);
  } catch {
    // Reporting must never mask the original error.
  }
}
