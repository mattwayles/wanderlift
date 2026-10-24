## Track: 51c — Onboarding flow rebuild + wiring
Last updated: 2026-10-24
### Done
- [x] Merged master (51a + 51b) into the worktree; npm ci.
- [x] Store helpers close the disclaimer trap; flow rebuilt and wired (value, start, goal,
  equipment, limitations, disclaimer, primer, reveal); Home passes `onStartFirstWorkout`; tests
  updated/added. Check rc=0.
### In progress
- Nothing. Track complete.
### Next
- Orchestrator: update the audit doc's onboarding section.
### Decisions / gotchas
- Order: ... disclaimer -> notification primer -> plan reveal LAST (reveal's Start is the final CTA).
- "Skip setup" (steps 2-5) jumps to the disclaimer; after it, a skipper goes straight to Today
  (no primer/reveal); a non-skipper continues to primer and reveal.
- Resume: in_progress + not acknowledged -> "Where are you starting?"; in_progress + acknowledged
  -> notification primer (questions are done).
- Bands in the equipment step: picking Bands sets all five owned AND bandsSetUp=true and shows the
  Your bands editor inline, so nobody meets an empty band picker later. Door also turns bands on
  (a door anchor is meaningless without a band) and says so inline.
- `beginOnboarding` keeps its name but no longer acknowledges; `finishOnboarding` returns a boolean
  and is a no-op until the disclaimer is acknowledged. icloud tests acknowledge before finishing.
- Reveal's Start: Home generates a 20-minute easy full-body session, leaves it pending, and
  navigates to Approval (falls back to Today if generation throws).
- Primer enable: saves prefs, calls ensureNotificationPermission then scheduleMotivationNotifications
  (hero null); Home re-derives the schedule after the first completed session as before.
- Restore offer lives on the first (value-screens) page above the panels.
