## Track: 53 — Exercise library audit
Last updated: 2026-10-26
### Done
- [x] Increment 1, ladder siblings: 19 exercises on thin rungs, validator's stale same-metric
  rule dropped, ENGINE_VERSION 2.13.0 (a09b75f)
- [x] Increment 2, accessory slots: 22 exercises (a569c56)
### In progress
- Increment 3: `CORE_CARDIO_STRETCH` batch in the script — hanging knee/leg raise, toe-touch
  crunch, seated knee tuck, plank hip dip, side plank reach-through; squat jack, step touch,
  grapevine, front kick, cross-body mountain climber, pogo hop, bodyweight lateral shuffle, A-skip,
  rope criss-cross, rope single-leg hop; standing quad stretch (closes the BACKLOG item), standing
  hamstring, butterfly, cross-body shoulder, overhead triceps, supine twist, downward dog; leg
  swings. Then goldens, tests, BACKLOG, commit.
### Next
- Pop the user's stash (see gotchas), re-run `jest -u` on goldens if the pop conflicts.
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
- Another session commits to master in parallel (a8fc9f3, untracked store `userData.*`,
  `app/src/lib/legal.ts`). Stage only this track's files; its in-progress store typecheck error is
  not ours.
- Text guards bite on incidental wording: "palms to face down" tripped the lying_prone guard
  (Zottman curl). Reword the cue rather than add a false tag.
