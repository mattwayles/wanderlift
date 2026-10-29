/**
 * Where each stamp sits on a Passport visa page. A person stamping a page does not land on a grid:
 * each stamp is a little off its slot, a little crooked, and has as much ink as the pad had. This
 * is that, deterministic per place (the same city always stamps the same way) and bounded so a
 * stamp is always readable:
 *   - tilt stays within +-MAX_TILT_DEG, nowhere near needing the phone turned;
 *   - opacity never drops below MIN_OPACITY, so the ink is lighter, never faint;
 *   - stamps may overlap at their rings, but never over each other's words: after the drift is
 *     applied, any two stamps whose text blocks would meet are pushed apart until they do not.
 */
import { seededRng } from './seed';
import { stampSpec } from '../ui/Stamp';

export const STAMP_COLUMNS = 3;
export const MAX_TILT_DEG = 14;
export const MIN_OPACITY = 0.82;
/** Stamp art size (the circle's diameter, the rectangle's height basis) at the natural scale. */
export const STAMP_SIZE = 100;
/** Space kept clear between two stamps' text blocks. */
export const TEXT_GAP = 6;

export interface StampSlot {
  label: string;
  shape: 'circle' | 'rect';
  /** Top-left of the stamp's art (its own box, before tilt), in the page's content space. */
  left: number;
  top: number;
  size: number;
  rotation: number;
  opacity: number;
}

export interface StampLayout {
  slots: StampSlot[];
  height: number;
}

/** Row pitch as a fraction of the stamp size: rows overlap at their rings by a tenth. */
const ROW_PITCH = 0.9;

/** The stamp art's own width and height (see `Stamp`: the rectangle is 1.25 wide, 0.86 tall). */
export function stampBox(slot: Pick<StampSlot, 'shape' | 'size'>): { w: number; h: number } {
  return slot.shape === 'circle'
    ? { w: slot.size, h: slot.size }
    : { w: Math.round(slot.size * 1.25), h: Math.round(slot.size * 0.86) };
}

/** The part of a stamp that carries its words, as a box in content space, tilt allowed for. */
export function textBlock(slot: StampSlot): { x0: number; y0: number; x1: number; y1: number } {
  const { w, h } = stampBox(slot);
  const cx = slot.left + slot.size / 2;
  const cy = slot.top + h / 2;
  // Two lines of title and the date inside the inner border, so about 0.8 of the width, and just
  // over half of the stamp's size tall; a few points more for the tilt.
  const tilt = Math.sin((Math.abs(slot.rotation) * Math.PI) / 180);
  const tw = (w * 0.8) / 2 + tilt * 0.28 * slot.size;
  const th = (slot.size * 0.56) / 2 + tilt * 0.4 * w * 0.5;
  return { x0: cx - tw, y0: cy - th, x1: cx + tw, y1: cy + th };
}

type Block = ReturnType<typeof textBlock>;
const overlapX = (a: Block, b: Block) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + TEXT_GAP;
const overlapY = (a: Block, b: Block) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + TEXT_GAP;

export function stampLayout(labels: string[], width: number): StampLayout {
  const cellW = width / STAMP_COLUMNS;
  const size = Math.min(STAMP_SIZE, Math.round(cellW * 0.88));
  const rowH = Math.round(size * ROW_PITCH);
  const slots: StampSlot[] = labels.map((label, i) => {
    const rng = seededRng(`stamp-place:${label}`);
    const col = i % STAMP_COLUMNS;
    const row = Math.floor(i / STAMP_COLUMNS);
    const driftX = (rng() * 2 - 1) * Math.min(cellW * 0.12, 14);
    const driftY = (rng() * 2 - 1) * rowH * 0.12;
    const s = Math.round(size * (0.94 + rng() * 0.12));
    return {
      label,
      shape: stampSpec(label).shape,
      left: Math.round(col * cellW + (cellW - s) / 2 + driftX),
      top: Math.round(row * rowH + (rowH - s) / 2 + driftY + rowH * 0.06),
      size: s,
      rotation: Math.round((rng() * 2 - 1) * MAX_TILT_DEG * 10) / 10,
      opacity: Math.round((MIN_OPACITY + rng() * (1 - MIN_OPACITY)) * 100) / 100,
    };
  });

  // Keep words apart: where two text blocks meet, move the later stamp out along the axis with the
  // smaller overlap. A few passes settle it, since a nudge can only meet a neighbour already placed.
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let j = 1; j < slots.length; j++) {
      for (let i = 0; i < j; i++) {
        const a = slots[i]!;
        const b = slots[j]!;
        const ba = textBlock(a);
        const bb = textBlock(b);
        const ox = overlapX(ba, bb);
        const oy = overlapY(ba, bb);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (oy <= ox) b.top += Math.sign(b.top - a.top || 1) * Math.ceil(oy);
        else b.left += Math.sign(b.left - a.left || 1) * Math.ceil(ox);
      }
    }
    if (!moved) break;
  }

  const bottom = slots.reduce((m, s) => Math.max(m, s.top + stampBox(s).h), 0);
  return { slots, height: Math.max(0, bottom + 12) };
}
