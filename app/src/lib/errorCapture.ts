/**
 * Local error capture: a small in-memory ring buffer of recent JS errors, fed by the global
 * handler and by the root error boundary. Nothing here is persisted or sent (reporting lives in
 * `sentry.ts`); the buffer exists so the "Share error details" action can include recent entries.
 */

export interface CapturedError {
  message: string;
  stack: string | null;
  componentStack: string | null;
  fatal: boolean;
  /** ISO timestamp. */
  at: string;
}

export const MAX_CAPTURED_ERRORS = 10;

const buffer: CapturedError[] = [];

export function recordError(
  error: unknown,
  opts: { fatal?: boolean; componentStack?: string | null } = {},
): CapturedError {
  const e = error as { message?: unknown; stack?: unknown } | null | undefined;
  const entry: CapturedError = {
    message: typeof e?.message === 'string' ? e.message : String(error),
    stack: typeof e?.stack === 'string' ? e.stack : null,
    componentStack: opts.componentStack ?? null,
    fatal: opts.fatal ?? false,
    at: new Date().toISOString(),
  };
  buffer.push(entry);
  if (buffer.length > MAX_CAPTURED_ERRORS) buffer.splice(0, buffer.length - MAX_CAPTURED_ERRORS);
  return entry;
}

/** Oldest first. A copy, so callers cannot mutate the buffer. */
export function recentErrors(): CapturedError[] {
  return buffer.slice();
}

export function clearCapturedErrors(): void {
  buffer.length = 0;
}

type Handler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler: () => Handler;
  setGlobalHandler: (h: Handler) => void;
}

let installed = false;

/** Wraps the global handler once: record, then always defer to the previous handler so default
 *  behaviour (red box in dev, native crash handling in release) is unchanged. */
export function installGlobalErrorCapture(): void {
  if (installed) return;
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return;
  installed = true;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    try {
      recordError(error, { fatal: !!isFatal });
    } catch {
      // Capturing must never mask the original error.
    }
    previous?.(error, isFatal);
  });
}

/** Test seam. */
export function resetErrorCaptureForTests(): void {
  installed = false;
  clearCapturedErrors();
}

/** Plain-text report for the share sheet: the current error, then other recent entries. */
export function formatErrorReport(
  current: CapturedError,
  meta: { version: string; now?: Date },
): string {
  const lines = [
    'Wanderlift error details',
    `App version: ${meta.version}`,
    `Time: ${(meta.now ?? new Date()).toISOString()}`,
    '',
    `Error: ${current.message}`,
  ];
  if (current.stack) lines.push('', 'Stack:', current.stack);
  if (current.componentStack) lines.push('', 'Component stack:', current.componentStack.trim());
  const others = recentErrors().filter((r) => r !== current);
  if (others.length) {
    lines.push('', 'Recent errors:');
    for (const r of others) {
      lines.push(`- ${r.at}${r.fatal ? ' (fatal)' : ''}: ${r.message}`);
    }
  }
  return lines.join('\n');
}
