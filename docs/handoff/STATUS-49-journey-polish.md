## Track: 49 — Journey polish + Passport blank page
Last updated: 2026-10-23

### Done
- [x] 49a Passport blank page — reload on focus (15ec05a)
- [x] 49b step caption once, above the Trails (e0fa9e6)
- [x] 49c Best set tile per exercise (848a594)
- [x] 49d Badges card "Open your badges ›" (09ed77f)

### In progress
- none. Simulator look owed for 49b-49d.

### Next
- none.

### Decisions / gotchas
- ExerciseDetailScreen has its own (different) ladder caption; out of scope here.
- The step note shows only when some Trail has a Progress chart (hidden on a fresh install).
- Best set tiles take the user's band colours via a new optional `tensions` prop; without it a
  band shows by its id.
- Full-suite runs hit intermittent jest timeouts (logged in BACKLOG). e0fa9e6 was committed after
  such a run (the check exit code was not gated); later runs of that tree are green.
