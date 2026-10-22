import { pathBounds, unionBounds } from './svgPathBounds';

describe('pathBounds', () => {
  it('handles absolute and relative lines, h/v and close', () => {
    expect(pathBounds('M10 20 L30 5 h5 v40 z')).toEqual({ minX: 10, minY: 5, maxX: 35, maxY: 45 });
    expect(pathBounds('m10 20 l5 5 l-20 0')).toEqual({ minX: -5, minY: 20, maxX: 15, maxY: 25 });
  });

  it('treats implicit repeats after a moveto as lines', () => {
    expect(pathBounds('M0 0 4 0 4 3')).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 3 });
  });

  it('includes curve control points and reads packed numbers', () => {
    expect(pathBounds('M0 0c1.5-2 3 .5 4 1')).toEqual({ minX: 0, minY: -2, maxX: 4, maxY: 1 });
  });

  it('reads arc flags packed against the next number', () => {
    expect(pathBounds('M0 0a1.7 1.7 0 012.9 1.1')).toEqual({
      minX: 0,
      minY: 0,
      maxX: 2.9,
      maxY: 1.1,
    });
  });

  it('returns null for an empty or unknown path', () => {
    expect(pathBounds('')).toBeNull();
    expect(pathBounds('M0 0 X1')).toBeNull();
  });

  it('unions boxes, skipping nulls', () => {
    expect(
      unionBounds([
        { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        null,
        { minX: -1, minY: 2, maxX: 0, maxY: 3 },
      ]),
    ).toEqual({ minX: -1, minY: 0, maxX: 1, maxY: 3 });
    expect(unionBounds([null])).toBeNull();
  });
});
