/**
 * Tracks 37l and 53 — the added isolation exercises are reachable: across ordinary seeds and lengths, each
 * new pattern and each new record turns up in generated sessions of its focus.
 */
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import type { ProgressionFamilyId } from '@roamfit/data';
import { generateSession } from './pipeline';
import { createRng } from './rng';
import { baseStartLevel } from './progression/ladder';
import { defaultMicroForExercise } from './progression/micro';
import { FIXED_POINT_ANCHORS } from './filters/hardFilters';
import { addDays } from './dates';
import type { ProgressionState, SessionHistoryRecord, UserState } from './types';

const byId = new Map(exerciseLibrary.exercises.map((e) => [e.id, e]));

function userState(): UserState {
  const progressionStates = {} as Record<ProgressionFamilyId, ProgressionState>;
  for (const family of familyLibrary.families) {
    const level = baseStartLevel(family);
    progressionStates[family.id] = {
      familyId: family.id,
      levelId: level.level_id,
      micro: defaultMicroForExercise(byId.get(level.anchor_exercise_id)!),
      consecutiveHits: 0,
      consecutiveMisses: 0,
      lastLevelChangeAt: null,
    };
  }
  return {
    profile: {
      units: 'lb',
      limitations: [],
      anchorsAvailable: [...FIXED_POINT_ANCHORS],
      disabledExerciseIds: [],
    },
    exerciseStates: {},
    progressionStates,
    history: [],
    hasEverCompletedSession: false,
  };
}

/** A user rotating Upper / Legs / Core / Full over many sessions (easy, medium and hard days, so a hard accessory gets its chance), history
 *  and exercise state carried forward, so the variety and over-worked rules act as they do for a
 *  real user. (A legs-only run never shows quad isolation: quads are over-worked every week.) */
function seen(): Set<string> {
  const ids = new Set<string>();
  let state = userState();
  let today = '2026-10-01';
  const FOCI = ['upper', 'legs', 'abs', 'full'] as const;
  for (let session = 0; session < 160; session++) {
    const focus = FOCI[session % FOCI.length];
    const difficulty = (['easy', 'medium', 'hard'] as const)[session % 3];
    const plan = generateSession({
      library: exerciseLibrary,
      families: familyLibrary,
      userState: state,
      request: { focus, difficulty, targetMinutes: 60 },
      clock: { today, tzId: 'UTC' },
      rng: createRng(session + 1),
    });
    const entries = [...plan.warmup, ...plan.main, ...plan.cooldown];
    for (const e of entries) ids.add(e.exerciseId);
    const exerciseStates = { ...state.exerciseStates };
    for (const e of entries) {
      const prev = exerciseStates[e.exerciseId];
      exerciseStates[e.exerciseId] = {
        exerciseId: e.exerciseId,
        lastPerformedAt: today,
        sessionsPerformed: (prev?.sessionsPerformed ?? 0) + 1,
        bestSet: null,
        difficultyEma: 0,
        skipCount: 0,
        swapAwayCount: 0,
        removeAtApprovalCount: 0,
        pinnedNote: null,
        suppressedUntil: null,
        disabledAt: null,
      };
    }
    const record: SessionHistoryRecord = {
      localDate: today,
      focus,
      difficulty: plan.difficulty,
      status: 'completed',
      entries: entries.map((e) => ({
        exerciseId: e.exerciseId,
        role: e.role,
        difficulty: e.difficulty,
        sets: e.sets,
      })),
    };
    state = {
      ...state,
      exerciseStates,
      history: [...state.history, record],
      hasEverCompletedSession: true,
    };
    today = addDays(today, 1);
  }
  return ids;
}

describe('track 37l and 53 isolation exercises', () => {
  const all = seen();

  it.each([
    ['upper', 'banded-concentration-curl'],
    ['upper', 'banded-drag-curl'],
    ['upper', 'banded-single-arm-pushdown'],
    ['upper', 'bw-wall-triceps-extension'],
    ['upper', 'banded-w-pull'],
    ['legs', 'bw-bent-knee-calf-raise'],
    ['legs', 'banded-seated-calf-raise'],
    ['legs', 'bw-tibialis-raise'],
    ['legs', 'banded-standing-hamstring-curl'],
    ['legs', 'banded-seated-leg-extension'],
    ['legs', 'banded-standing-adduction'],
    ['legs', 'bw-side-lying-adduction'],
    ['legs', 'bw-prone-hip-extension'],
    ['legs', 'bw-bench-reverse-hyper'],
    ['legs', 'banded-seated-hamstring-curl'],
    ['legs', 'bw-glute-bridge-walkout'],
    ['legs', 'bw-sissy-squat'],
    ['legs', 'bw-reverse-nordic'],
    ['legs', 'banded-spanish-squat'],
    ['legs', 'bw-copenhagen-plank'],
    ['legs', 'bw-short-lever-copenhagen-plank'],
    ['legs', 'bw-side-lying-hip-abduction'],
    ['legs', 'banded-seated-hip-abduction'],
    ['legs', 'banded-fire-hydrant'],
    ['legs', 'banded-glute-bridge-abduction'],
    ['legs', 'bw-deficit-calf-raise'],
    ['upper', 'bw-inverted-bicep-curl'],
    ['upper', 'banded-bayesian-curl'],
    ['upper', 'banded-zottman-curl'],
    ['upper', 'bw-bodyweight-triceps-extension'],
    ['upper', 'banded-cuban-press'],
    ['upper', 'banded-scaption-raise'],
    ['upper', 'banded-single-arm-external-rotation'],
    ['upper', 'bw-wall-slide'],
    ['abs', 'bw-hanging-leg-raise'],
    ['abs', 'bw-toe-touch-crunch'],
    ['abs', 'bw-plank-hip-dip'],
    ['abs', 'bw-side-plank-reach-through'],
    ['legs', 'cd-standing-quad-stretch'],
    ['legs', 'cd-standing-hamstring-stretch'],
    ['legs', 'cd-butterfly-stretch'],
    ['upper', 'cd-cross-body-shoulder-stretch'],
    ['upper', 'cd-overhead-triceps-stretch'],
    ['abs', 'cd-supine-spinal-twist'],
    ['legs', 'cd-downward-dog'],
    ['legs', 'wu-leg-swings'],
  ] as const)('%s sessions can include %s', (focus, id) => {
    expect(byId.get(id)).toBeDefined();
    expect(byId.get(id)!.focus).toContain(focus);
    expect(all.has(id)).toBe(true);
  });
});

/** The abs flexion pool is ~30 deep, so one rotating user never meets all of it (several existing
 *  medium crunches don't turn up either). Independent cold-start abs days show the track 53
 *  additions are eligible and drawn. */
describe('track 53 flexion additions', () => {
  it.each(['bw-hanging-knee-raise', 'bw-seated-knee-tuck'])('abs sessions can include %s', (id) => {
    let found = false;
    for (let seed = 1; seed <= 200 && !found; seed++) {
      const plan = generateSession({
        library: exerciseLibrary,
        families: familyLibrary,
        userState: userState(),
        request: { focus: 'abs', difficulty: 'medium', targetMinutes: 45 },
        clock: { today: '2026-10-01', tzId: 'UTC' },
        rng: createRng(seed),
      });
      found = plan.main.some((e) => e.exerciseId === id);
    }
    expect(found).toBe(true);
  });
});
