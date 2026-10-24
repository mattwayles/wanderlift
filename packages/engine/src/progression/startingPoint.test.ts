import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import type { ProgressionFamily } from '@roamfit/data';
import { baseStartLevel, isMaxLevel, levelById, nextLevel } from './ladder';
import { levelUpForTooEasy } from './rules';
import {
  MIN_RUNGS_ABOVE_START,
  STARTING_POINTS,
  isStartingPoint,
  startingLevelFor,
} from './startingPoint';
import { defaultMicroForExercise } from './micro';
import type { ProgressionState } from '../types';

const library = exerciseLibrary.exercises;

function syntheticFamily(levelCount: number): ProgressionFamily {
  const base = familyLibrary.families[0];
  return {
    ...base,
    levels: Array.from({ length: levelCount }, (_, i) => ({
      ...base.levels[0],
      level_id: `synthetic.l${i}`,
    })),
  };
}

function indexOf(family: ProgressionFamily, levelId: string): number {
  return family.levels.findIndex((l) => l.level_id === levelId);
}

describe('startingLevelFor', () => {
  it('lists the four options weakest to strongest', () => {
    expect([...STARTING_POINTS]).toEqual(['restarting', 'occasional', 'active', 'regular']);
    expect(isStartingPoint('active')).toBe(true);
    expect(isStartingPoint('elite')).toBe(false);
  });

  describe.each(familyLibrary.families.map((f) => [f.id, f] as const))('%s', (_id, family) => {
    it("restarting is exactly the first rung (today's baseStartLevel)", () => {
      expect(startingLevelFor(family, 'restarting')).toBe(baseStartLevel(family));
    });

    it.each(STARTING_POINTS)('%s: a real, climbable rung with >= 2 rungs above', (point) => {
      const level = startingLevelFor(family, point);
      expect(levelById(family, level.level_id)).toBe(level);
      expect(isMaxLevel(family, level.level_id)).toBe(false);
      expect(family.levels.length - 1 - indexOf(family, level.level_id)).toBeGreaterThanOrEqual(
        MIN_RUNGS_ABOVE_START,
      );
    });

    it('is monotonic: a stronger option never starts lower', () => {
      const indexes = STARTING_POINTS.map((p) =>
        indexOf(family, startingLevelFor(family, p).level_id),
      );
      for (let i = 1; i < indexes.length; i++) {
        expect(indexes[i]).toBeGreaterThanOrEqual(indexes[i - 1]);
      }
    });

    it.each(STARTING_POINTS)('%s: the level-up path advances at least twice', (point) => {
      const start = startingLevelFor(family, point);
      const anchor = library.find((e) => e.id === start.anchor_exercise_id)!;
      let state: ProgressionState = {
        familyId: family.id,
        levelId: start.level_id,
        micro: defaultMicroForExercise(anchor),
        consecutiveHits: 0,
        consecutiveMisses: 0,
        lastLevelChangeAt: null,
      };
      let advances = 0;
      for (let i = 0; i < 2; i++) {
        const next = levelUpForTooEasy(state, family, library);
        if (!next) break;
        state = next.state;
        advances++;
      }
      expect(advances).toBe(2);
      expect(state.levelId).toBe(
        nextLevel(family, nextLevel(family, start.level_id)!.level_id)!.level_id,
      );
    });
  });

  it('clamps on short ladders so two rungs always remain', () => {
    for (const n of [3, 4]) {
      const family = syntheticFamily(n);
      for (const point of STARTING_POINTS) {
        const idx = indexOf(family, startingLevelFor(family, point).level_id);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(n - 1 - MIN_RUNGS_ABOVE_START);
      }
    }
    // 3 rungs: everything collapses to the first; 4 rungs: nothing starts above the second.
    expect(startingLevelFor(syntheticFamily(3), 'regular').level_id).toBe('synthetic.l0');
    expect(startingLevelFor(syntheticFamily(4), 'regular').level_id).toBe('synthetic.l1');
  });

  it('maps a 9-rung ladder by fraction of (n - 1)', () => {
    const family = syntheticFamily(9);
    const ids = STARTING_POINTS.map((p) => startingLevelFor(family, p).level_id);
    expect(ids).toEqual(['synthetic.l0', 'synthetic.l1', 'synthetic.l2', 'synthetic.l4']);
  });
});
