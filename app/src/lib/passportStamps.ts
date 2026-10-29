/**
 * Where each stamp sits on a Passport visa page, and what it looks like. A person stamping a page
 * does not use a grid: stamps come in different shapes and sizes, land anywhere, sit crooked, and
 * carry as much ink as the pad had. This is that, deterministic per place and per page, and bounded
 * so a stamp is always readable:
 *   - tilt stays within +-MAX_TILT_DEG, nowhere near needing the phone turned;
 *   - opacity never drops below MIN_OPACITY;
 *   - a stamp may overlap a neighbour's rim, but never its words (`textBlock`): placement rejects
 *     any spot where two text blocks would meet, and shrinks the stamp if none is left;
 *   - overlap is the exception: each stamp goes where there is the most room (best-candidate
 *     sampling), so the page fills evenly and stamps only share rim when they have to.
 *
 * Stamps are laid in the order given and each depends only on those before it, so a stamp added
 * later never moves the ones already on the page.
 */
import { seededRng } from './seed';
import { textFractions, type StampShape } from '../ui/Stamp';

export const MAX_TILT_DEG = 14;
export const MIN_OPACITY = 0.82;
/** Space kept clear between two stamps' text blocks. */
export const TEXT_GAP = 5;
/** Share of the page the stamps' boxes cover, when a page holds `PAGE_CAPACITY` of them. */
export const COVERAGE = 0.46;
/** What a full page holds, for sizing: a page with fewer stamps simply has more room. */
export const PAGE_CAPACITY = 15;
const EDGE = 4;
/** How many random spots each stamp tries; fewer is looser and more hand-like. */
const CANDIDATES = 48;
/** A stamp's box may share this fraction of its short side with a neighbour's before the spot is
 *  turned down (rim only; the words are checked separately and never allowed to meet). */
const RIM_OVERLAP = 0.14;
/** Width the words of the longest label ('NEW YORK, NY, USA') need at the smallest type a stamp uses,
 *  so a small stamp is made bigger rather than clipped. */
const MIN_TEXT_W = 64;

export interface StampSlot {
  label: string;
  shape: StampShape;
  /** The stamp art's own box, centred on (cx, cy), before tilt. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
}

export interface StampLayout {
  slots: StampSlot[];
}

/** Share of picks and the width-to-height range of each shape. */
const SHAPES: ReadonlyArray<{ shape: StampShape; weight: number; aspect: [number, number] }> = [
  { shape: 'circle', weight: 0.2, aspect: [1, 1] },
  { shape: 'oval', weight: 0.22, aspect: [1.3, 1.65] },
  { shape: 'rect', weight: 0.24, aspect: [1.05, 1.7] },
  { shape: 'octagon', weight: 0.17, aspect: [1.05, 1.45] },
  { shape: 'hexagon', weight: 0.17, aspect: [1.35, 1.75] },
];

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** The part of a stamp that carries its words, tilt allowed for. */
export function textBlock(
  s: Pick<StampSlot, 'cx' | 'cy' | 'w' | 'h' | 'shape' | 'rotation'>,
): Rect {
  const f = textFractions(s.shape);
  const bw = s.w * f.w;
  const bh = s.h * f.h;
  const rad = (Math.abs(s.rotation) * Math.PI) / 180;
  const hw = (Math.cos(rad) * bw + Math.sin(rad) * bh) / 2;
  const hh = (Math.sin(rad) * bw + Math.cos(rad) * bh) / 2;
  return { x0: s.cx - hw, y0: s.cy - hh, x1: s.cx + hw, y1: s.cy + hh };
}

function textsMeet(a: StampSlot, b: StampSlot): boolean {
  const ta = textBlock(a);
  const tb = textBlock(b);
  return (
    Math.min(ta.x1, tb.x1) - Math.max(ta.x0, tb.x0) + TEXT_GAP > 0 &&
    Math.min(ta.y1, tb.y1) - Math.max(ta.y0, tb.y0) + TEXT_GAP > 0
  );
}

/** Gap between two stamps' boxes along the axis they are furthest apart on; negative = overlap. */
function boxGap(a: StampSlot, b: StampSlot): number {
  return Math.max(Math.abs(a.cx - b.cx) - (a.w + b.w) / 2, Math.abs(a.cy - b.cy) - (a.h + b.h) / 2);
}

function pickShape(r: number): (typeof SHAPES)[number] {
  let acc = 0;
  for (const s of SHAPES) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return SHAPES[SHAPES.length - 1]!;
}

/** What each label looks like, independent of the page: shape, proportions, size, tilt, ink. */
function lookOf(label: string) {
  const rng = seededRng(`stamp-look:${label}`);
  const spec = pickShape(rng());
  const aspect = spec.aspect[0] + rng() * (spec.aspect[1] - spec.aspect[0]);
  const scale = 0.72 + rng() * 0.56;
  return {
    shape: spec.shape,
    aspect,
    scale,
    rotation: Math.round((rng() * 2 - 1) * MAX_TILT_DEG * 10) / 10,
    opacity: Math.round((MIN_OPACITY + rng() * (1 - MIN_OPACITY)) * 100) / 100,
  };
}

export function stampLayout(labels: string[], width: number, height: number): StampLayout {
  const pageArea = Math.max(1, width * height);
  // Area for an average stamp; each one's own scale spreads sizes around it (the mean of scale^2 is
  // about 1, so a full page lands near COVERAGE).
  const unit = (pageArea * COVERAGE) / PAGE_CAPACITY;
  const placed: StampSlot[] = [];

  for (const label of labels) {
    const look = lookOf(label);
    const rng = seededRng(`stamp-place:${label}`);
    let area = unit * look.scale * look.scale;
    let slot: StampSlot | null = null;

    // Shrink until a spot is found that keeps every stamp's words apart; one nearly always is on
    // the first try, and a tiny page just gets smaller stamps.
    for (let attempt = 0; attempt < 8 && !slot; attempt++) {
      const minW = MIN_TEXT_W / textFractions(look.shape).w;
      let w = Math.max(minW, Math.sqrt(area * look.aspect));
      let h = w / look.aspect;
      w = Math.min(w, width - 2 * EDGE);
      h = Math.min(h, height - 2 * EDGE);
      const base = {
        label,
        shape: look.shape,
        w,
        h,
        rotation: look.rotation,
        opacity: look.opacity,
      };

      let best: { slot: StampSlot; score: number } | null = null;
      for (let k = 0; k < CANDIDATES; k++) {
        const cand: StampSlot = {
          ...base,
          cx: EDGE + w / 2 + rng() * Math.max(0, width - 2 * EDGE - w),
          cy: EDGE + h / 2 + rng() * Math.max(0, height - 2 * EDGE - h),
        };
        if (placed.some((p) => textsMeet(cand, p))) continue;
        // The roomiest spot wins; only a rim-sized overlap is tolerated, and it costs.
        let score = Infinity;
        for (const p of placed) score = Math.min(score, boxGap(cand, p));
        if (score < -RIM_OVERLAP * Math.min(w, h)) {
          score -= 1000; // allowed only if nothing better exists
        }
        if (best === null || score > best.score) best = { slot: cand, score };
      }
      if (best) slot = best.slot;
      else area *= 0.85;
      if (!slot && w <= minW) break;
    }
    // Last resort on a page too small for its stamps: tuck it where nothing meets, scanning.
    if (!slot) {
      const w = MIN_TEXT_W / textFractions(look.shape).w;
      const h = w / look.aspect;
      const base = {
        label,
        shape: look.shape,
        w,
        h,
        rotation: look.rotation,
        opacity: look.opacity,
      };
      scan: for (let cy = EDGE + h / 2; cy <= height - EDGE - h / 2; cy += 8) {
        for (let cx = EDGE + w / 2; cx <= width - EDGE - w / 2; cx += 8) {
          const cand = { ...base, cx, cy };
          if (!placed.some((p) => textsMeet(cand, p))) {
            slot = cand;
            break scan;
          }
        }
      }
      slot ??= { ...base, cx: width / 2, cy: height / 2 };
    }
    placed.push(slot);
  }
  return { slots: placed };
}
