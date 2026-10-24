/**
 * Track 51a — onboarding's "Where are you starting?". Moves each ladder to the rung the engine
 * picks for the answer (`startingLevelFor`, by stable `level_id` — invariant 5) and remembers the
 * answer on the user.
 *
 * The engine decides the rung; this only persists it (invariant 2). It is not a user correction
 * of a rung, so it logs no signal.
 *
 * A ladder that already has history is never moved: a restored iCloud backup (or a user who has
 * trained) must not be knocked to a different rung by re-answering a setup question. "History" is
 * a completed session with a completed set on the family, or any live hit/miss streak. Everything
 * else — rows seeded at level 1 by the first dashboard read, rows from an earlier answer — moves,
 * so the user can change their answer during onboarding.
 */
import { defaultMicroForExercise, startingLevelFor } from '@roamfit/engine';
import type { ProgressionState, StartingPoint } from '@roamfit/engine';
import type { Exercise, FamilyLibrary, ProgressionFamilyId } from '@roamfit/data';
import type { Db } from './db';
import { getFamilyPerformanceHistory } from './repositories/exerciseCatalog';
import { getAllProgressionStates, upsertProgressionState } from './repositories/progressionState';
import { updateUser } from './repositories/users';

export interface ApplyStartingPointResult {
  /** Families whose row now sits at the starting rung (created, moved, or already there). */
  applied: ProgressionFamilyId[];
  /** Families left alone because they already have history. */
  skippedWithHistory: ProgressionFamilyId[];
}

export function applyStartingPoint(
  db: Db,
  point: StartingPoint,
  families: FamilyLibrary,
  library: readonly Exercise[],
  now: string,
): ApplyStartingPointResult {
  const states = getAllProgressionStates(db);
  const result: ApplyStartingPointResult = { applied: [], skippedWithHistory: [] };

  for (const family of families.families) {
    const existing: ProgressionState | undefined = states[family.id];
    if (existing && hasHistory(db, existing)) {
      result.skippedWithHistory.push(family.id);
      continue;
    }
    const level = startingLevelFor(family, point);
    const anchor = library.find((e) => e.id === level.anchor_exercise_id);
    // Same seed as `ensureProgressionStatesInitialized`: a fresh micro for the rung's anchor.
    const micro = anchor
      ? defaultMicroForExercise(anchor)
      : { repTarget: 10, band: null, tempoSec: 3, restSec: 45, sets: 3 };
    upsertProgressionState(
      db,
      {
        familyId: family.id,
        levelId: level.level_id,
        micro,
        // Entering a rung fresh, as any level change does.
        consecutiveHits: 0,
        consecutiveMisses: 0,
        lastLevelChangeAt: existing?.lastLevelChangeAt ?? null,
      },
      now,
    );
    result.applied.push(family.id);
  }

  updateUser(db, { startingPoint: point }, now);
  return result;
}

function hasHistory(db: Db, state: ProgressionState): boolean {
  return (
    state.consecutiveHits > 0 ||
    state.consecutiveMisses > 0 ||
    getFamilyPerformanceHistory(db, state.familyId).length > 0
  );
}
