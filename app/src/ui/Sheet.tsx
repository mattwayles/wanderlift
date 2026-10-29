/**
 * Bottom sheet on a transparent `Modal`: the backdrop fades, the panel slides up (radius `xl` on
 * top). Replaces every ad-hoc centered dialog. The Modal stays mounted through the exit animation
 * and unmounts once it finishes; Reduce Motion makes both transitions instant. Dragging the panel
 * down dismisses it (past a distance or a flick); a shorter drag springs back.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { makeStyles, radius, space, useTheme } from '../theme';
import { Txt } from './Txt';
import { useInsets } from './useInsets';
import { useReduceMotion } from './useReduceMotion';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Tapping the backdrop closes it (default true). */
  dismissable?: boolean;
  testID?: string;
  children?: React.ReactNode;
}

export function Sheet({
  visible,
  onClose,
  title,
  dismissable = true,
  testID = 'sheet',
  children,
}: SheetProps): React.JSX.Element | null {
  const theme = useTheme();
  const styles = useStyles();
  const reduceMotion = useReduceMotion();
  const insets = useInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.setValue(0);
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      const anim = Animated.spring(progress, {
        toValue: 1,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }
    if (reduceMotion) {
      progress.setValue(0);
      setMounted(false);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduceMotion, progress, drag]);

  // Drag-to-dismiss. Claims only a mostly-vertical downward drag, so taps and a child ScrollView's
  // own scrolling (which claims first, deeper in the tree) are untouched.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissableRef = useRef(dismissable);
  dismissableRef.current = dismissable;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        dismissableRef.current && g.dy > 6 && g.dy > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.8) {
          // The exit animation carries on from where the drag left the panel.
          onCloseRef.current();
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.backdrop, opacity: progress },
          ]}
        >
          <Pressable
            testID={`${testID}-backdrop`}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={dismissable ? onClose : undefined}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.avoider}
        >
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            {...pan.panHandlers}
            style={[
              styles.panel,
              {
                maxHeight: height * 0.88,
                paddingBottom: Math.max(insets.bottom, space.lg) + space.md,
                transform: [
                  {
                    translateY: Animated.add(
                      progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [Math.min(height * 0.5, 420), 0],
                      }),
                      drag,
                    ),
                  },
                ],
              },
            ]}
          >
            <View style={styles.grabber} />
            {title ? (
              <Txt variant="h2" style={styles.title} accessibilityRole="header">
                {title}
              </Txt>
            ) : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1 },
    avoider: { flex: 1, justifyContent: 'flex-end' },
    panel: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: t.colors.line,
      paddingHorizontal: space.xl,
      paddingTop: space.md,
      ...t.elevation.card,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.lineStrong,
      marginBottom: space.lg,
    },
    title: { marginBottom: space.lg },
  }),
);
