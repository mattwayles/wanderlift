/**
 * Track 53 — library audit. Pins what the audit added, so a later edit can't quietly thin these
 * pools back out. Authored by `scripts/add_library_audit_exercises.js`.
 */
import { exerciseLibrary, familyLibrary } from './index';

const byId = new Map(exerciseLibrary.exercises.map((e) => [e.id, e]));
const level = (levelId: string) =>
  familyLibrary.families.flatMap((f) => f.levels).find((l) => l.level_id === levelId)!;

describe('track 53: ladder rungs that held one exercise now have a sibling', () => {
  it.each([
    ['squat.l0', 'bw-assisted-squat'],
    ['squat.l1', 'bw-prisoner-squat'],
    ['squat.l7', 'bw-shrimp-squat'],
    ['lunge.l0', 'bw-low-step-up'],
    ['lunge.l1', 'bw-forward-lunge'],
    ['lunge.l7', 'bw-skater-squat'],
    ['hinge.l7', 'bw-single-leg-slider-curl'],
    ['horizontal_push.l8', 'bw-typewriter-push-up'],
    ['vertical_push.l6b', 'bw-wall-hspu-negative'],
    ['vertical_pull.l6b', 'bw-negative-pull-up'],
    ['vertical_pull.l8', 'bw-wide-grip-pull-up'],
    ['vertical_pull.l9', 'bw-typewriter-pull-up'],
  ])('%s holds %s and more than one exercise', (levelId, id) => {
    const l = level(levelId);
    expect(l.exercise_ids).toContain(id);
    expect(l.exercise_ids.length).toBeGreaterThan(1);
    expect(byId.get(id)!.progression_level_id).toBe(levelId);
  });

  it('a new sibling matches its rung anchor’s difficulty band (no easy move on a hard rung)', () => {
    const order = { easy: 0, medium: 1, hard: 2 } as const;
    for (const family of familyLibrary.families) {
      for (const l of family.levels) {
        const anchor = byId.get(l.anchor_exercise_id)!;
        for (const id of l.exercise_ids) {
          const ex = byId.get(id)!;
          if (!AUDIT_LADDER_IDS.includes(id)) continue;
          expect({
            id,
            gap: Math.abs(order[ex.difficulty] - order[anchor.difficulty]) <= 1,
          }).toEqual({ id, gap: true });
        }
      }
    }
  });
});

const AUDIT_LADDER_IDS = [
  'bw-assisted-squat',
  'bw-prisoner-squat',
  'bw-shrimp-squat',
  'bw-low-step-up',
  'bw-forward-lunge',
  'bw-skater-squat',
  'banded-pull-through',
  'banded-kickstand-rdl',
  'bw-single-leg-slider-curl',
  'bw-hand-release-push-up',
  'bw-plyo-push-up',
  'bw-typewriter-push-up',
  'bw-wall-hspu-negative',
  'bw-negative-pull-up',
  'bw-wide-grip-pull-up',
  'bw-typewriter-pull-up',
  'bw-rkc-plank',
  'bw-star-side-plank',
  'bw-hollow-rock',
];
