import {
  MAX_CAPTURED_ERRORS,
  formatErrorReport,
  installGlobalErrorCapture,
  recentErrors,
  recordError,
  resetErrorCaptureForTests,
} from './errorCapture';

describe('errorCapture', () => {
  beforeEach(() => resetErrorCaptureForTests());

  it('caps the ring buffer, keeping the newest entries', () => {
    for (let i = 0; i < MAX_CAPTURED_ERRORS + 5; i++) recordError(new Error(`e${i}`));
    const all = recentErrors();
    expect(all).toHaveLength(MAX_CAPTURED_ERRORS);
    expect(all[0].message).toBe('e5');
    expect(all[all.length - 1].message).toBe(`e${MAX_CAPTURED_ERRORS + 4}`);
  });

  it('records non-Error throwables', () => {
    expect(recordError('boom').message).toBe('boom');
  });

  it('global handler records, then chains to the previous handler', () => {
    const previous = jest.fn();
    let installed: ((e: unknown, f?: boolean) => void) | undefined;
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      getGlobalHandler: () => previous,
      setGlobalHandler: (h: (e: unknown, f?: boolean) => void) => {
        installed = h;
      },
    };
    installGlobalErrorCapture();
    const err = new Error('uncaught');
    installed!(err, true);
    expect(previous).toHaveBeenCalledWith(err, true);
    expect(recentErrors()[0]).toMatchObject({ message: 'uncaught', fatal: true });
  });

  it('formats a report with version, error and other recent entries', () => {
    recordError(new Error('older'));
    const cur = recordError(new Error('current'), { componentStack: '\n  in Foo' });
    const text = formatErrorReport(cur, { version: '1.2.3 (4)' });
    expect(text).toContain('1.2.3 (4)');
    expect(text).toContain('Error: current');
    expect(text).toContain('in Foo');
    expect(text).toContain('older');
  });
});
