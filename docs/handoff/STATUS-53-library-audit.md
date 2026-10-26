## Track: 53 — Exercise library audit
Last updated: 2026-10-26
### Done
- (none yet)
### In progress
- Increment 1: ladder siblings. New exercises + rung placements authored in
  `packages/data/scripts/add_library_audit_exercises.js` (idempotent, same shape as
  `add_sibling_exercises.js`), run it, regenerate goldens, `npm run check`, commit.
### Next
1. Ladder siblings for thin rungs (squat l0/l1/l7, lunge l0/l1/l7, hinge l3/l4/l7,
   horizontal_push l4/l7/l8, vertical_push l6b, vertical_pull l6b/l8/l9, anti_extension l4/l6/l7).
2. Accessory patterns with no or one bodyweight option: hip_extension (1 record), knee_flexion and
   knee_extension (band only), adduction (2), elbow_flexion (no bodyweight), elbow_extension,
   shoulder_isolation, abduction, calf.
3. Core (hanging raises, toe-touch crunch, etc.), cardio additions, quad and other missing
   stretches (BACKLOG "No quad stretch"), dynamic warm-ups.
### Decisions / gotchas
- The user had uncommitted WIP (medium restSec 75 -> 60 in `difficultyTable.ts`, its test, the
  golden snapshot). It is in `git stash` ("user WIP: medium rest 75->60 ...") so each commit here
  is checked against HEAD. Pop it at the end; the snapshot will need `jest -u` again after the pop.
- `npm run validate:library` already fails on 4 mixed-metric rungs (squat.l2, anti_extension.l1/l2).
  That is stale: c9d0c1f made mixed reps/time rungs legal (micro/tiers map positions across
  ranges); validate.ts was not updated. Ignore those 4; any other error is ours.
- Only exercises that are established, named movements. No invented exercises.
- `movementKey` test: a group sharing an id stem (minus `bw-`/`banded-`) or name (minus "Banded")
  must be exactly one band + one bodyweight record. New pairs are deliberate (fire hydrant,
  kickstand RDL, lateral shuffle).
- Tag to the 37c standard; the text guards in `contraindications.test.ts` key off cue wording
  ("on your back", "face down", "hands and knees", "high plank").
- Goldens shift with pool size; regenerate and bump ENGINE_VERSION.
