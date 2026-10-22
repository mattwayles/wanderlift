/**
 * Bounding box of an SVG path string. Pure. Curve control points count as part of the box, so it
 * is a slight over-estimate for curves (fine for choosing a crop), and an arc counts by its end
 * point. Handles every path command, absolute and relative, and arc flags packed against the
 * next number ("a1 1 0 012 3").
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const ARGS: Record<string, number> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
  z: 0,
};

const NUM = /^[\s,]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/;
const FLAG = /^[\s,]*([01])/;
const CMD = /^[\s,]*([a-zA-Z])/;

export function pathBounds(d: string): Bounds | null {
  let rest = d;
  let cmd = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (px: number, py: number): void => {
    if (px < b.minX) b.minX = px;
    if (px > b.maxX) b.maxX = px;
    if (py < b.minY) b.minY = py;
    if (py > b.maxY) b.maxY = py;
  };
  const num = (flag: boolean): number | null => {
    const m = (flag ? FLAG : NUM).exec(rest);
    if (!m) return null;
    rest = rest.slice(m[0].length);
    return Number(m[1]);
  };

  for (;;) {
    const c = CMD.exec(rest);
    if (c) {
      cmd = c[1]!;
      rest = rest.slice(c[0].length);
    } else if (!cmd || !NUM.test(rest)) {
      break;
    }
    const lower = cmd.toLowerCase();
    const n = ARGS[lower];
    if (n === undefined) return null;
    const rel = cmd === lower;
    if (n === 0) {
      x = startX;
      y = startY;
      continue;
    }
    const a: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = num(lower === 'a' && (i === 3 || i === 4));
      if (v === null) return null;
      a.push(v);
    }
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (lower === 'h') {
      x = ox + a[0]!;
    } else if (lower === 'v') {
      y = oy + a[0]!;
    } else {
      // Every other command ends on its last coordinate pair; earlier pairs are control points.
      for (let i = 0; i < n - 2; i += 2) {
        if (lower !== 'a') add(ox + a[i]!, oy + a[i + 1]!);
      }
      x = ox + a[n - 2]!;
      y = oy + a[n - 1]!;
    }
    add(x, y);
    if (lower === 'm') {
      startX = x;
      startY = y;
      // Further pairs after a moveto are implicit linetos.
      cmd = rel ? 'l' : 'L';
    }
  }
  return b.minX === Infinity ? null : b;
}

export function unionBounds(list: readonly (Bounds | null)[]): Bounds | null {
  let out: Bounds | null = null;
  for (const b of list) {
    if (!b) continue;
    out = out
      ? {
          minX: Math.min(out.minX, b.minX),
          minY: Math.min(out.minY, b.minY),
          maxX: Math.max(out.maxX, b.maxX),
          maxY: Math.max(out.maxY, b.maxY),
        }
      : b;
  }
  return out;
}
