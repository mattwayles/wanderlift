/**
 * "Where are you starting?" — onboarding maps an honest self-description to a starting rung on
 * every ladder. Pure: no I/O. The level is returned (and persisted by the store) by stable
 * `level_id`, never an index (invariant 5).
 *
 * Climbability is the guarantee: whatever the answer, the start is never the top rung and always
 * leaves at least {@link MIN_RUNGS_ABOVE_START} rungs above it, on every ladder, so a user is
 * never handed a ladder they have already finished.
 */
import type { ProgressionFamily, ProgressionFamilyLevel } from '@roamfit/data';

/** Weakest to strongest. */
export const STARTING_POINTS = ['restarting', 'occasional', 'active', 'regular'] as const;
export type StartingPoint = (typeof STARTING_POINTS)[number];

export function isStartingPoint(v: unknown): v is StartingPoint {
  return typeof v === 'string' && (STARTING_POINTS as readonly string[]).includes(v);
}

/** How far up the ladder each answer targets, before the climbability clamp. */
const START_FRACTION: Record<StartingPoint, number> = {
  restarting: 0,
  occasional: 0.2,
  active: 0.35,
  regular: 0.5,
};

/** A start always leaves at least this many rungs to climb. */
export const MIN_RUNGS_ABOVE_START = 2;

export function startingLevelFor(
  family: ProgressionFamily,
  point: StartingPoint,
): ProgressionFamilyLevel {
  const n = family.levels.length;
  const target = Math.floor(START_FRACTION[point] * (n - 1));
  const index = Math.max(0, Math.min(target, n - 1 - MIN_RUNGS_ABOVE_START));
  return family.levels[index];
}
