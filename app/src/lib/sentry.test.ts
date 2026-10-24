import * as Sentry from '@sentry/react-native';
import { initSentry, reportError } from './sentry';

describe('sentry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is off in dev: no init, no reports', () => {
    initSentry();
    reportError(new Error('boom'));
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  describe('enabled', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.EXPO_PUBLIC_SENTRY_DEV = '1';
    });
    afterEach(() => {
      delete process.env.EXPO_PUBLIC_SENTRY_DEV;
    });

    function load() {
      /* eslint-disable @typescript-eslint/no-require-imports -- fresh module instance per test */
      return {
        mod: require('./sentry') as typeof import('./sentry'),
        sdk: require('@sentry/react-native') as typeof Sentry,
      };
      /* eslint-enable @typescript-eslint/no-require-imports */
    }

    it('inits without PII, replay, or console breadcrumbs, and scrubs the user', () => {
      const { mod, sdk } = load();
      mod.initSentry();
      const opts = (sdk.init as jest.Mock).mock.calls[0][0];
      expect(opts.sendDefaultPii).toBe(false);
      expect(opts.replaysOnErrorSampleRate).toBeUndefined();
      expect(opts.beforeBreadcrumb({ category: 'console' })).toBeNull();
      expect(opts.beforeBreadcrumb({ category: 'navigation' })).toEqual({ category: 'navigation' });
      expect(opts.beforeSend({ user: { id: 'x' }, message: 'm' })).toEqual({ message: 'm' });
    });

    it('reports with the component stack and never throws', () => {
      const { mod, sdk } = load();
      const err = new Error('boom');
      mod.reportError(err, { componentStack: 'at Foo' });
      expect(sdk.captureException).toHaveBeenCalledWith(err, {
        extra: { componentStack: 'at Foo' },
      });
      (sdk.captureException as jest.Mock).mockImplementation(() => {
        throw new Error('sdk down');
      });
      expect(() => mod.reportError(err)).not.toThrow();
    });
  });
});
