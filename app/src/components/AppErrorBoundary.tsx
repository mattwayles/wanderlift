import React from 'react';
import { Appearance, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { appVersionLabel } from '../lib/appInfo';
import { reportError } from '../lib/sentry';
import { formatErrorReport, recordError, type CapturedError } from '../lib/errorCapture';
import { themeFor } from '../theme';

/**
 * Root error boundary. It sits outside every provider (safe-area, store, theme), so a throw in any
 * of them still lands here. The fallback therefore depends on no app context: plain views, colors
 * from `themeFor(Appearance...)`, and its own `SafeAreaProvider`. "Try again" remounts the
 * children; their state is rebuilt from SQLite, which is why the copy can say history is safe.
 */
const ZERO_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

interface State {
  error: unknown;
  captured: CapturedError | null;
  attempt: number;
}

export default class AppErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  State
> {
  state: State = { error: null, captured: null, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error ?? new Error('Unknown error') };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const captured = recordError(error, { componentStack: info.componentStack });
    reportError(error, { componentStack: info.componentStack });
    this.setState({ captured });
  }

  private retry = () => {
    this.setState((s) => ({ error: null, captured: null, attempt: s.attempt + 1 }));
  };

  render() {
    if (this.state.error === null) {
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? ZERO_METRICS}>
        <ErrorFallback
          error={this.state.error}
          captured={this.state.captured}
          onRetry={this.retry}
        />
      </SafeAreaProvider>
    );
  }
}

function ErrorFallback({
  error,
  captured,
  onRetry,
}: {
  error: unknown;
  captured: CapturedError | null;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = themeFor(Appearance.getColorScheme() === 'light' ? 'light' : 'dark').colors;

  const share = () => {
    const current = captured ?? recordError(error);
    const message = formatErrorReport(current, { version: appVersionLabel() });
    void Share.share({ message, title: 'Wanderlift error details' }).catch(() => {});
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.bg,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.copy, { color: c.text2 }]}>
          Your workouts and history are safe on this device. Trying again usually gets you back to
          where you were.
        </Text>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={[styles.primary, { backgroundColor: c.gold }]}
      >
        <Text style={[styles.primaryText, { color: c.ink }]}>Try again</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share error details"
        onPress={share}
        style={[styles.secondary, { borderColor: c.lineStrong }]}
      >
        <Text style={[styles.secondaryText, { color: c.text }]}>Share error details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flexGrow: 1, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  copy: { fontSize: 17, lineHeight: 24 },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryText: { fontSize: 17, fontWeight: '700' },
  secondary: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryText: { fontSize: 17, fontWeight: '600' },
});
