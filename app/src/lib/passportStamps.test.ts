import {
  MAX_TILT_DEG,
  MIN_OPACITY,
  STAMP_COLUMNS,
  stampBox,
  stampLayout,
  textBlock,
} from './passportStamps';
import { PASSPORT_STAMPS_PER_PAGE } from './dashboard';

const labels = (n: number) => Array.from({ length: n }, (_, i) => `City${i}, XX`);
const WIDTHS = [300, 340, 390, 420];

describe('stampLayout', () => {
  it('is deterministic: the same places stamp the same way', () => {
    const a = stampLayout(labels(12), 360);
    expect(stampLayout(labels(12), 360)).toEqual(a);
    // A place keeps its tilt and ink when the others on the page change.
    const alone = stampLayout(['City3, XX'], 360).slots[0]!;
    const inRow = a.slots[3]!;
    expect(alone.rotation).toBe(inRow.rotation);
    expect(alone.opacity).toBe(inRow.opacity);
  });

  it('looks hand-stamped: tilts and inks vary', () => {
    const { slots } = stampLayout(labels(PASSPORT_STAMPS_PER_PAGE), 360);
    expect(new Set(slots.map((s) => s.rotation)).size).toBeGreaterThan(8);
    expect(new Set(slots.map((s) => s.opacity)).size).toBeGreaterThan(8);
  });

  it.each(WIDTHS)('keeps every stamp readable at width %i', (width) => {
    const { slots } = stampLayout(labels(PASSPORT_STAMPS_PER_PAGE), width);
    for (const s of slots) {
      expect(Math.abs(s.rotation)).toBeLessThanOrEqual(MAX_TILT_DEG);
      expect(s.opacity).toBeGreaterThanOrEqual(MIN_OPACITY);
      expect(s.opacity).toBeLessThanOrEqual(1);
    }
  });

  it.each(WIDTHS)('never lets one stamp cover another one’s words, at width %i', (width) => {
    // Many different pages' worth of places, so the seeded drift is exercised broadly.
    for (let page = 0; page < 40; page++) {
      const { slots } = stampLayout(
        Array.from({ length: PASSPORT_STAMPS_PER_PAGE }, (_, i) => `P${page}-${i}, ZZ`),
        width,
      );
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = textBlock(slots[i]!);
          const b = textBlock(slots[j]!);
          const apart = a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0;
          expect(apart).toBe(true);
        }
      }
    }
  });

  it('keeps the stamps on the page, give or take the tilt', () => {
    for (const width of WIDTHS) {
      const { slots } = stampLayout(labels(PASSPORT_STAMPS_PER_PAGE), width);
      for (const s of slots) {
        const { w } = stampBox(s);
        const left = s.left - (w - s.size) / 2;
        expect(left).toBeGreaterThanOrEqual(-12);
        expect(left + w).toBeLessThanOrEqual(width + 12);
      }
    }
  });

  it('overlaps a little: some stamps touch at their rings', () => {
    const { slots } = stampLayout(labels(PASSPORT_STAMPS_PER_PAGE), 360);
    let touching = 0;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]!;
        const b = slots[j]!;
        const ab = stampBox(a);
        const bb = stampBox(b);
        const ax = a.left - (ab.w - a.size) / 2;
        const bx = b.left - (bb.w - b.size) / 2;
        if (ax < bx + bb.w && bx < ax + ab.w && a.top < b.top + bb.h && b.top < a.top + ab.h) {
          touching += 1;
        }
      }
    }
    expect(touching).toBeGreaterThan(0);
  });

  it('is three across, and as tall as its rows', () => {
    expect(STAMP_COLUMNS).toBe(3);
    const one = stampLayout(labels(3), 360).height;
    const two = stampLayout(labels(4), 360).height;
    expect(two).toBeGreaterThan(one);
    expect(stampLayout([], 360).height).toBeGreaterThanOrEqual(0);
  });
});
