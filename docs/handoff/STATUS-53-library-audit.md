## Track: 53 — Exercise library audit
Last updated: 2026-10-26
### Done
- [x] Increment 1, ladder siblings: 19 exercises on thin rungs, validator's stale same-metric
  rule dropped, ENGINE_VERSION 2.13.0 (a09b75f)
### In progress
- Increment 2: accessory patterns. Add an `ACCESSORIES` batch to
  `scripts/add_library_audit_exercises.js` and append it to `BATCHES`: hip_extension (prone hip
  extension, bench reverse hyper), knee_flexion (banded seated ham curl, glute bridge walkout),
  knee_extension (sissy squat, reverse Nordic, banded Spanish squat), adduction (Copenhagen plank,
  short-lever Copenhagen), abduction (side-lying hip abduction, banded seated abduction, banded
  fire hydrant, banded bridge abduction), calf (deficit calf raise), elbow_flexion (bodyweight
  curl on a low bar, banded Bayesian and Zottman curls), elbow_extension (bodyweight triceps
  extension), shoulder_isolation (banded Cuban press, scaption, single-arm external rotation,
  wall slide). Then goldens, check, commit. Extend `libraryAudit.test.ts`.
### Next
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
