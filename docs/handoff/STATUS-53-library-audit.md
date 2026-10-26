## Track: 53 — Exercise library audit
Last updated: 2026-10-26
### Done
- [x] Increment 1, ladder siblings: 19 exercises on thin rungs, validator's stale same-metric
  rule dropped, ENGINE_VERSION 2.13.0 (a09b75f)
- [x] Increment 2, accessory slots: 22 exercises (a569c56)
- [x] Increment 3, core / cardio / stretches / warm-up: 24 exercises, BACKLOG quad-stretch item
  closed, reachability sim widened (this commit)
### In progress
- (none) Library 320 -> 385 exercises.
### Next
- Pop the user's stash (see gotchas), re-run `jest -u` on goldens if the pop conflicts.
- Not done, by choice: siblings for the 5 rungs listed in BACKLOG; wrist/forearm work (no
  pattern for it); band cardio beyond the 8 existing (no established banded move that the
  thigh-loop / anchor model describes honestly).
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
- Track-number clash: a parallel session opened `STATUS-53-launch-items.md` at the same time.
  This file is the library audit; tell them apart by slug.
- `isolation.test.ts` reachability sim now rotates easy/medium/hard over 160 sessions: hard
  accessories are only eligible on hard days (`isDifficultyEligible`), and the 80-session
  easy/medium run lost `banded-seated-leg-extension` to the bigger knee_extension pool. The abs
  flexion pool (~30) is too deep for one rotating user (6 pre-existing crunches never appear
  either), so the two new medium flexion moves get an independent 200-seed check instead.
- Another session commits to master in parallel (a8fc9f3, untracked store `userData.*`,
  `app/src/lib/legal.ts`). Stage only this track's files; its in-progress store typecheck error is
  not ours.
- Text guards bite on incidental wording: "palms to face down" tripped the lying_prone guard
  (Zottman curl). Reword the cue rather than add a false tag.
