/**
 * Track 51b — three swipeable intro panels shown before any setup question. Props-driven: it
 * only reports `onDone` (Skip and the last button both call it); the caller decides what's next.
 * A plain paging `ScrollView`; the Next button scrolls it and the dots follow either route. No
 * auto-advance, and the scroll is not animated under Reduce Motion. Copy never guilts
 * (invariant 4): no streaks, no red days.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { makeStyles, radius, space } from '../../theme';
import { Button, TopoPattern, Txt, useReduceMotion } from '../../ui';

export interface ValueScreensProps {
  onDone: () => void;
}

export const VALUE_PANELS = [
  {
    eyebrow: 'Train anywhere',
    title: 'Your gym fits in a bag.',
    body: 'Bands and your own bodyweight are all it takes. Loop a band round a door, a tree or a railing and you have a gym wherever you are.',
  },
  {
    eyebrow: 'It moves with you',
    title: 'Every move is a ladder.',
    body: 'Each exercise has easier and harder steps. As you get stronger, Wanderlift moves you up a rung for you, so you never have to work out what is next.',
  },
  {
    eyebrow: 'No guilt, ever',
    title: 'Rest is part of training.',
    body: 'No streaks to break and no red days. Miss a few days and your plan is simply there when you come back.',
  },
] as const;

export function ValueScreens({ onDone }: ValueScreensProps): React.JSX.Element {
  const styles = useStyles();
  const reduceMotion = useReduceMotion();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === VALUE_PANELS.length - 1;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.min(VALUE_PANELS.length - 1, Math.max(0, i)));
    },
    [width],
  );

  const next = () => {
    if (last) {
      onDone();
      return;
    }
    const to = index + 1;
    setIndex(to);
    scroller.current?.scrollTo({ x: to * width, animated: !reduceMotion });
  };

  return (
    <View style={styles.root} testID="value-screens" onLayout={onLayout}>
      <TopoPattern seed="wanderlift-value" strength={0.5} />
      <View style={styles.top}>
        <Button
          testID="value-skip"
          label="Skip"
          variant="quiet"
          size="sm"
          accessibilityHint="Skips the introduction"
          onPress={onDone}
        />
      </View>
      <ScrollView
        ref={scroller}
        testID="value-pager"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {VALUE_PANELS.map((p, i) => (
          <View
            key={p.eyebrow}
            style={[styles.panel, { width }]}
            testID={`value-panel-${i}`}
            accessible
            accessibilityLabel={`${i + 1} of ${VALUE_PANELS.length}. ${p.title} ${p.body}`}
          >
            <Txt variant="eyebrow" color="gold">
              {p.eyebrow}
            </Txt>
            <Txt variant="h1" accessibilityRole="header">
              {p.title}
            </Txt>
            <Txt variant="body" color="text2">
              {p.body}
            </Txt>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <View
          style={styles.dots}
          testID="value-dots"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {VALUE_PANELS.map((p, i) => (
            <View
              key={p.eyebrow}
              testID={`value-dot-${i}`}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <Button
          testID="value-next"
          label={last ? 'Get started' : 'Next'}
          size="lg"
          fullWidth
          accessibilityHint={
            last ? undefined : `Shows panel ${index + 2} of ${VALUE_PANELS.length}`
          }
          onPress={next}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.colors.bg },
    top: { alignItems: 'flex-end', paddingHorizontal: space.lg, paddingTop: space.lg },
    pager: { flex: 1 },
    panel: { justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xxl },
    bottom: { gap: space.xl, paddingHorizontal: space.xxl, paddingBottom: space.xxl },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: t.colors.line,
    },
    dotActive: { width: 24, backgroundColor: t.colors.teal },
  }),
);
