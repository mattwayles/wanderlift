import {
  MAX_TILT_DEG,
  MIN_OPACITY,
  stampLayout,
  textBlock,
  type StampSlot,
} from './passportStamps';
import { PASSPORT_STAMPS_PER_PAGE } from './dashboard';

const N = PASSPORT_STAMPS_PER_PAGE;
const labels = (n: number, tag = 'City') => Array.from({ length: n }, (_, i) => `${tag}${i}, XX`);
// Pages from a small phone (iPhone SE) to a large one; the book is the screen less its margins.
const PAGES: Array<[number, number]> = [
  [350, 480],
  [360, 520],
  [390, 640],
  [420, 700],
];

const boxesMeet = (a: StampSlot, b: StampSlot) =>
  Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2;

describe('stampLayout', () => {
  it('is deterministic, and a stamp added later never moves the ones already on the page', () => {
    const a = stampLayout(labels(10), 390, 640);
    expect(stampLayout(labels(10), 390, 640)).toEqual(a);
    expect(stampLayout(labels(12), 390, 640).slots.slice(0, 10)).toEqual(a.slots);
  });

  it('varies shape, size and proportion, not just circles and rectangles', () => {
    const { slots } = stampLayout(labels(N), 390, 640);
    expect(new Set(slots.map((s) => s.shape)).size).toBeGreaterThanOrEqual(4);
    const areas = slots.map((s) => s.w * s.h);
    expect(Math.max(...areas) / Math.min(...areas)).toBeGreaterThan(1.6);
    const aspects = slots.map((s) => s.w / s.h);
    expect(Math.max(...aspects) - Math.min(...aspects)).toBeGreaterThan(0.5);
  });

  it.each(PAGES)('keeps every stamp readable on a %i x %i page', (w, h) => {
    for (let page = 0; page < 30; page++) {
      const { slots } = stampLayout(labels(N, `P${page}-`), w, h);
      for (const s of slots) {
        expect(Math.abs(s.rotation)).toBeLessThanOrEqual(MAX_TILT_DEG);
        expect(s.opacity).toBeGreaterThanOrEqual(MIN_OPACITY);
        expect(s.opacity).toBeLessThanOrEqual(1);
      }
      // Overlap is allowed at the rims; one stamp covering another's words never is.
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = textBlock(slots[i]!);
          const b = textBlock(slots[j]!);
          expect(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0).toBe(true);
        }
      }
    }
  });

  it.each(PAGES)('keeps the stamps on a %i x %i page', (w, h) => {
    for (let page = 0; page < 30; page++) {
      for (const s of stampLayout(labels(N, `P${page}-`), w, h).slots) {
        expect(s.cx - s.w / 2).toBeGreaterThanOrEqual(-0.5);
        expect(s.cx + s.w / 2).toBeLessThanOrEqual(w + 0.5);
        expect(s.cy - s.h / 2).toBeGreaterThanOrEqual(-0.5);
        expect(s.cy + s.h / 2).toBeLessThanOrEqual(h + 0.5);
      }
    }
  });

  it('covers the whole page, top to bottom and side to side, and is not a grid', () => {
    for (const [w, h] of PAGES.slice(1)) {
      let topGap = 0;
      let bottomGap = 0;
      let columns = 0;
      const PAGES_TRIED = 20;
      for (let page = 0; page < PAGES_TRIED; page++) {
        const { slots } = stampLayout(labels(N, `Q${page}-`), w, h);
        topGap += Math.min(...slots.map((s) => s.cy - s.h / 2)) / h;
        bottomGap += (h - Math.max(...slots.map((s) => s.cy + s.h / 2))) / h;
        // How many 24pt-wide slices of the page hold a stamp's centre: three columns would be 3.
        columns += new Set(slots.map((s) => Math.floor(s.cx / 24))).size;
      }
      expect(topGap / PAGES_TRIED).toBeLessThan(0.1);
      expect(bottomGap / PAGES_TRIED).toBeLessThan(0.1);
      expect(columns / PAGES_TRIED).toBeGreaterThan(7);
    }
  });

  it('overlaps only now and then', () => {
    let overlapping = 0;
    let total = 0;
    for (let page = 0; page < 40; page++) {
      const { slots } = stampLayout(labels(N, `R${page}-`), 390, 640);
      for (const s of slots) {
        total += 1;
        if (slots.some((o) => o !== s && boxesMeet(s, o))) overlapping += 1;
      }
    }
    expect(overlapping / total).toBeLessThan(0.45);
  });

  it('handles no stamps, and a page too small for its stamps', () => {
    expect(stampLayout([], 390, 640).slots).toEqual([]);
    expect(stampLayout(labels(N), 120, 120).slots).toHaveLength(N);
  });
});
