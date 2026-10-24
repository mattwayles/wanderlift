## Track: 51c — Onboarding flow rebuild + wiring
Last updated: 2026-10-24
### Done
- [x] Merged master (51a + 51b) into the worktree; npm ci.
### In progress
- Increment 1: store helpers close the disclaimer trap (`beginOnboarding` no longer acknowledges;
  `finishOnboarding` only completes once the disclaimer is acknowledged) + tests.
### Next
- 2: OnboardingFlow reorder (value screens, starting point, goal, equipment, limitations,
  disclaimer, primer, reveal) + update existing onboarding tests.
- 3: equipment step, primer wiring, plan reveal wiring, climbability integration test.
### Decisions / gotchas
- Order: ... disclaimer -> notification primer -> plan reveal LAST (reveal's Start is the final CTA).
- "Skip setup" (steps 2-5) jumps to the disclaimer; after it, a skipper goes straight to Today
  (no primer/reveal); a non-skipper continues to primer and reveal.
- Resume: in_progress + not acknowledged -> "Where are you starting?"; in_progress + acknowledged
  -> notification primer (questions are done).
- Bands in the equipment step: picking Bands sets all five owned AND bandsSetUp=true and shows the
  Your bands editor inline, so nobody meets an empty band picker later. Door also turns bands on
  (a door anchor is meaningless without a band) and says so inline.
