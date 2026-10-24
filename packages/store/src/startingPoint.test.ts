/**
 * Track 51a — applyStartingPoint: rows move for a fresh user, a ladder with history is left alone,
 * re-applying a different answer moves them again, and the answer round-trips on the user.
 */
import { defaultMicroForExercise, startingLevelFor } from '@roamfit/engine';
import type { StartingPoint } from '@roamfit/engine';
import { createTestDb } from './testHarness';
import { schema } from './db';
import type { Db } from './db';
import { applyStartingPoint } from './startingPoint';
import {
  ensureProgressionStatesInitialized,
  getAllProgressionStates,
  upsertProgressionState,
} from './repositories/progressionState';
import { ensureUser, getUser } from './repositories/users';
import { clockFor, families, library, rngFor, utcInstantFor } from './testFixtures';
import { levelUpFamily } from './levelUp';

const NOW = utcInstantFor('2026-10-24');
const LATER = utcInstantFor('2026-10-25');

function expectedLevelIds(point: StartingPoint): Record<string, string> {
  return Object.fromEntries(
    families.families.map((f) => [f.id, startingLevelFor(f, point).level_id]),
  );
}

function levelIds(db: Db): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getAllProgressionStates(db)).map(([id, s]) => [id, s.levelId]),
  );
}

/** One completed session with one completed set on `familyId`'s entry. */
function logCompletedSet(db: Db, familyId: string, levelId: string, exerciseId: string): void {
  db.insert(schema.sessions)
    .values({
      id: 'hist-session',
      userId: 'local',
      status: 'completed',
      utcInstant: '2026-10-01T08:00:00.000Z',
      localDate: '2026-10-01',
      tzId: 'America/New_York',
      focus: 'upper',
      difficulty: 'medium',
      targetMinutes: 30,
      estimatedMinutes: 30,
      anchorsSnapshot: '[]',
      explanation: 'test',
      engineVersion: 'test',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    })
    .run();
  db.insert(schema.sessionEntries)
    .values({
      id: 'hist-entry',
      sessionId: 'hist-session',
      section: 'main',
      orderIndex: 0,
      plannedExerciseId: exerciseId,
      exerciseId,
      role: 'main',
      band: null,
      sets: 3,
      repTarget: 10,
      restSec: 60,
      tempoSec: 3,
      difficulty: 'medium',
      pattern: 'horizontal_push',
      anchorClass: 'none',
      estimatedSec: 200,
      entryStatus: 'planned',
      progressionFamilyId: familyId,
      progressionLevelIdAtTime: levelId,
    })
    .run();
  db.insert(schema.setLogs)
    .values({
      id: 'hist-set',
      entryId: 'hist-entry',
      setIndex: 0,
      status: 'completed',
      repsActual: 10,
      secondsActual: null,
      bandActual: null,
      restPrescribedSec: 60,
      createdAt: '2026-10-01T08:10:00.000Z',
    })
    .run();
}

describe('applyStartingPoint', () => {
  it("creates a row for every family on a fresh user, at that point's rung with a fresh micro", () => {
    const { db, close } = createTestDb();
    try {
      const result = applyStartingPoint(db, 'active', families, library.exercises, NOW);
      expect(levelIds(db)).toEqual(expectedLevelIds('active'));
      expect(result.skippedWithHistory).toEqual([]);
      expect(result.applied).toHaveLength(families.families.length);
      for (const family of families.families) {
        const level = startingLevelFor(family, 'active');
        const anchor = library.exercises.find((e) => e.id === level.anchor_exercise_id)!;
        expect(getAllProgressionStates(db)[family.id]).toMatchObject({
          micro: defaultMicroForExercise(anchor),
          consecutiveHits: 0,
          consecutiveMisses: 0,
        });
      }
    } finally {
      close();
    }
  });

  it('moves rows already seeded at level 1 (the dashboard seeds them before onboarding)', () => {
    const { db, close } = createTestDb();
    try {
      ensureProgressionStatesInitialized(db, families, library.exercises, NOW);
      expect(levelIds(db)).toEqual(expectedLevelIds('restarting'));
      applyStartingPoint(db, 'regular', families, library.exercises, LATER);
      expect(levelIds(db)).toEqual(expectedLevelIds('regular'));
      // At least one real ladder genuinely moved off its first rung.
      expect(levelIds(db)).not.toEqual(expectedLevelIds('restarting'));
    } finally {
      close();
    }
  });

  it('leaves a family with logged history untouched, and moves the rest', () => {
    const { db, close } = createTestDb();
    try {
      ensureProgressionStatesInitialized(db, families, library.exercises, NOW);
      const push = families.families.find((f) => f.id === 'horizontal_push')!;
      const pushLevel = push.levels[1];
      upsertProgressionState(
        db,
        { ...getAllProgressionStates(db).horizontal_push, levelId: pushLevel.level_id },
        NOW,
      );
      logCompletedSet(db, 'horizontal_push', pushLevel.level_id, pushLevel.anchor_exercise_id);
      const before = getAllProgressionStates(db).horizontal_push;

      const result = applyStartingPoint(db, 'regular', families, library.exercises, LATER);

      expect(result.skippedWithHistory).toEqual(['horizontal_push']);
      expect(getAllProgressionStates(db).horizontal_push).toEqual(before);
      const expected = expectedLevelIds('regular');
      for (const [id, levelId] of Object.entries(levelIds(db))) {
        if (id !== 'horizontal_push') expect(levelId).toBe(expected[id]);
      }
    } finally {
      close();
    }
  });

  it('leaves a family with a live hit or miss streak untouched', () => {
    const { db, close } = createTestDb();
    try {
      ensureProgressionStatesInitialized(db, families, library.exercises, NOW);
      const squat = getAllProgressionStates(db).squat;
      upsertProgressionState(db, { ...squat, consecutiveMisses: 1 }, NOW);
      applyStartingPoint(db, 'regular', families, library.exercises, LATER);
      expect(getAllProgressionStates(db).squat).toMatchObject({
        levelId: squat.levelId,
        consecutiveMisses: 1,
      });
    } finally {
      close();
    }
  });

  it('re-applying a different point moves the ladders again', () => {
    const { db, close } = createTestDb();
    try {
      applyStartingPoint(db, 'regular', families, library.exercises, NOW);
      expect(levelIds(db)).toEqual(expectedLevelIds('regular'));
      applyStartingPoint(db, 'occasional', families, library.exercises, LATER);
      expect(levelIds(db)).toEqual(expectedLevelIds('occasional'));
      applyStartingPoint(db, 'restarting', families, library.exercises, LATER);
      expect(levelIds(db)).toEqual(expectedLevelIds('restarting'));
    } finally {
      close();
    }
  });

  it('saves the point on the user, and re-applying replaces it', () => {
    const { db, close } = createTestDb();
    try {
      expect(ensureUser(db, NOW).startingPoint).toBeNull();
      applyStartingPoint(db, 'active', families, library.exercises, NOW);
      expect(getUser(db)?.startingPoint).toBe('active');
      applyStartingPoint(db, 'occasional', families, library.exercises, LATER);
      expect(getUser(db)?.startingPoint).toBe('occasional');
    } finally {
      close();
    }
  });

  it.each(['restarting', 'occasional', 'active', 'regular'] as const)(
    '%s: every ladder can still level up twice through the store',
    (point) => {
      const { db, close } = createTestDb();
      try {
        applyStartingPoint(db, point, families, library.exercises, NOW);
        for (const family of families.families) {
          for (let i = 0; i < 2; i++) {
            const up = levelUpFamily(
              db,
              {
                familyId: family.id,
                library,
                families,
                clock: clockFor('2026-10-24'),
                rng: rngFor(i),
              },
              NOW,
            );
            expect(up.status).toBe('levelled_up');
          }
        }
      } finally {
        close();
      }
    },
  );
});
