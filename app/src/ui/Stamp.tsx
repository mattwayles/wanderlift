/**
 * Passport stamp. Shape (circle / rounded rect), tilt (-8..8 deg) and — unless `tone` is given —
 * color are all derived from `seed`, so a given city or milestone always stamps the same way.
 * Double inset border in the ink color, condensed uppercase text, 90% opacity like real ink.
 * `rotation` and `opacity` override the seeded tilt and the 90% for a caller that places stamps
 * by hand (the Passport pages).
 */
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, Polygon } from 'react-native-svg';
import { seededRng } from '../lib/seed';
import { radius, useTheme, type AccentName } from '../theme';
import { Txt } from './Txt';

const INKS: readonly AccentName[] = ['teal', 'gold', 'sky', 'summit', 'fern'];

/** `circle` and `rect` are what a seed picks; the rest are for a caller that chooses (Passport). */
export type StampShape = 'circle' | 'rect' | 'oval' | 'octagon' | 'hexagon';

/**
 * How much of a stamp's width and height its words take, per shape. The Passport layout keeps these
 * blocks from meeting, so a stamp can overlap another's rim but never its words.
 */
export function textFractions(shape: StampShape): { w: number; h: number } {
  switch (shape) {
    case 'circle':
      return { w: 0.74, h: 0.5 };
    case 'oval':
      return { w: 0.7, h: 0.52 };
    case 'rect':
      return { w: 0.8, h: 0.58 };
    case 'octagon':
      return { w: 0.76, h: 0.56 };
    case 'hexagon':
      return { w: 0.68, h: 0.58 };
  }
}

/** Largest type, up to `base`, at which the longest word of `title` still fits `availW` (condensed
 *  caps run about 0.46 em a letter), so a long city shrinks instead of breaking mid-word. */
export function fitTitleFont(title: string, base: number, availW: number): number {
  const longest = Math.max(1, ...title.split(/\s+/).map((w) => w.length));
  return Math.max(9, Math.min(base, Math.floor(availW / (longest * 0.46))));
}

export interface StampSpec {
  shape: 'circle' | 'rect';
  /** Degrees, -8..8, one decimal. */
  rotation: number;
  tone: AccentName;
}

/** Pure, deterministic look for a seed (exported for tests and for callers that need the tone). */
export function stampSpec(seed: string, tone?: AccentName): StampSpec {
  const rng = seededRng(`stamp:${seed}`);
  const shape = rng() < 0.5 ? 'circle' : 'rect';
  const rotation = Math.round((rng() * 16 - 8) * 10) / 10;
  const seededTone = INKS[Math.floor(rng() * INKS.length)]!;
  return { shape, rotation, tone: tone ?? seededTone };
}

export interface StampProps {
  title: string;
  subtitle?: string;
  seed: string;
  tone?: AccentName;
  size?: number;
  /** Replaces the seeded shape, and with `width` and `height` the size-derived box. */
  shape?: StampShape;
  width?: number;
  height?: number;
  /** Degrees; replaces the seeded tilt. */
  rotation?: number;
  /** 0..1; replaces the default 0.9. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Stamp({
  title,
  subtitle,
  seed,
  tone,
  size = 112,
  shape: shapeProp,
  width: widthProp,
  height: heightProp,
  rotation,
  opacity = 0.9,
  style,
  testID = 'stamp',
}: StampProps): React.JSX.Element {
  const theme = useTheme();
  const spec = stampSpec(seed, tone);
  const ink = theme.colors[spec.tone];
  const shape: StampShape = shapeProp ?? spec.shape;
  if (shape === 'oval' || shape === 'octagon' || shape === 'hexagon') {
    return (
      <FramedStamp
        shape={shape}
        title={title}
        subtitle={subtitle}
        ink={ink}
        width={widthProp ?? Math.round(size * 1.3)}
        height={heightProp ?? size}
        rotation={rotation ?? spec.rotation}
        opacity={opacity}
        style={style}
        testID={testID}
      />
    );
  }
  const width = widthProp ?? (shape === 'circle' ? size : Math.round(size * 1.25));
  const height = heightProp ?? (shape === 'circle' ? size : Math.round(size * 0.86));
  // Type scales with the stamp's real size: an explicit box overrides `size`, which would otherwise
  // set a 112pt stamp's type on a 90pt one.
  const typeSize =
    widthProp !== undefined && heightProp !== undefined
      ? Math.round(shape === 'circle' ? Math.min(width, height) : Math.min(width, height) / 0.86)
      : size;
  const outerRadius = shape === 'circle' ? Math.min(width, height) / 2 : radius.sm;
  const inset = 4;
  const innerRadius = Math.max(outerRadius - inset, 4);

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[
        styles.outer,
        {
          width,
          height,
          borderRadius: outerRadius,
          borderColor: ink,
          opacity,
          transform: [{ rotate: `${rotation ?? spec.rotation}deg` }],
        },
        style,
      ]}
    >
      <View style={[styles.inner, { margin: inset, borderRadius: innerRadius, borderColor: ink }]}>
        <Txt
          variant="h2"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          align="center"
          style={{
            color: ink,
            fontSize: fitTitleFont(title, Math.round(typeSize * 0.19), width - 2 * (inset + 8)),
            lineHeight: Math.round(typeSize * 0.21),
          }}
        >
          {title}
        </Txt>
        {subtitle ? (
          <Txt
            variant="eyebrow"
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.sub,
              {
                color: ink,
                fontSize: Math.min(11, Math.round(typeSize * 0.105)),
                letterSpacing: typeSize < 100 ? 0.6 : 1.2,
              },
            ]}
          >
            {subtitle}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/** The border of an oval, octagon or hexagon: an outer and an inner line, as the round and
 *  rectangular stamps have, drawn in SVG since a border radius cannot make these. */
function frameShape(
  shape: 'oval' | 'octagon' | 'hexagon',
  w: number,
  h: number,
  inset: number,
  ink: string,
  strokeWidth: number,
): React.JSX.Element {
  const iw = w - 2 * inset;
  const ih = h - 2 * inset;
  const common = { fill: 'none', stroke: ink, strokeWidth, strokeLinejoin: 'round' as const };
  if (shape === 'oval') {
    return <Ellipse cx={w / 2} cy={h / 2} rx={iw / 2} ry={ih / 2} {...common} />;
  }
  const x0 = inset;
  const y0 = inset;
  const pts =
    shape === 'octagon'
      ? (() => {
          const c = Math.min(iw, ih) * 0.28;
          return [
            [x0 + c, y0],
            [x0 + iw - c, y0],
            [x0 + iw, y0 + c],
            [x0 + iw, y0 + ih - c],
            [x0 + iw - c, y0 + ih],
            [x0 + c, y0 + ih],
            [x0, y0 + ih - c],
            [x0, y0 + c],
          ];
        })()
      : (() => {
          const p = Math.min(ih * 0.5, iw * 0.22);
          return [
            [x0 + p, y0],
            [x0 + iw - p, y0],
            [x0 + iw, y0 + ih / 2],
            [x0 + iw - p, y0 + ih],
            [x0 + p, y0 + ih],
            [x0, y0 + ih / 2],
          ];
        })();
  return <Polygon points={pts.map((p) => p.join(',')).join(' ')} {...common} />;
}

function FramedStamp({
  shape,
  title,
  subtitle,
  ink,
  width,
  height,
  rotation,
  opacity,
  style,
  testID,
}: {
  shape: 'oval' | 'octagon' | 'hexagon';
  title: string;
  subtitle?: string;
  ink: string;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  style?: StyleProp<ViewStyle>;
  testID: string;
}): React.JSX.Element {
  const frac = textFractions(shape);
  const basis = Math.min(width, height);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[
        { width, height, opacity, transform: [{ rotate: `${rotation}deg` }] },
        styles.framed,
        style,
      ]}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {frameShape(shape, width, height, 1, ink, 2)}
        {frameShape(shape, width, height, 5, ink, 1)}
      </Svg>
      <View
        style={{
          width: width * frac.w,
          height: height * frac.h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt
          variant="h2"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          align="center"
          style={{
            color: ink,
            fontSize: fitTitleFont(title, Math.round(basis * 0.22), width * frac.w),
            lineHeight: Math.round(basis * 0.24),
          }}
        >
          {title}
        </Txt>
        {subtitle ? (
          <Txt
            variant="eyebrow"
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.sub,
              { color: ink, fontSize: Math.min(11, Math.round(basis * 0.12)), letterSpacing: 0.6 },
            ]}
          >
            {subtitle}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  framed: { alignItems: 'center', justifyContent: 'center' },
  outer: { borderWidth: 2, alignItems: 'stretch', justifyContent: 'center' },
  inner: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sub: { marginTop: 2, fontSize: 11, letterSpacing: 1.2 },
});
