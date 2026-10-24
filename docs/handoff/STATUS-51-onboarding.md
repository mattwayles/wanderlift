## Track: 51 — Onboarding rework (from the Production & Growth Readiness Audit)
Last updated: 2026-10-24 (Track 51 complete)
Orchestrated: sub-tracks are built by separate agents in git worktrees and merged here.

### Done
- [x] 51a starting point, engine + store + migration 0042 (merged 364b287). API: engine
  `StartingPoint`, `STARTING_POINTS`, `startingLevelFor`; store `applyStartingPoint(db, point,
  families, library, now)` -> {applied, skippedWithHistory}; `user.startingPoint`; app copy
  `app/src/lib/startingPoint.ts` `STARTING_POINT_OPTIONS`.
- [x] 51b components in app/src/components/onboarding/: ValueScreens {onDone}, PlanReveal {trails,
  sessionsThisWeek, goalLabel, today?, onStart, onLater}, NotificationPrimer {defaultTime,
  onEnable(time), onSkip}; weekDays.ts helpers (merged d3ccd35). Check rc=0 after both.

- [x] 51c flow rebuilt and wired (merged 1727ef7; typecheck fix on master after merge).
  Order: value screens -> where are you starting -> goal -> what do you have -> limitations ->
  disclaimer (as care, gate) -> reminders primer -> plan reveal ("Start my first workout" ->
  Approval with a 20-min easy full-body session).

### In progress
- none. Device pass owed (see BACKLOG).

### Next
- Paywall step: when monetization lands.

### Decisions / gotchas
- Paywall step (audit item 6) left out: there is no subscription, and the audit itself says
  launch with no paywall.
- Climbability: a starting rung is never the top rung and always leaves >= 2 rungs above it, on
  every ladder (7-11 rungs). Never moves a ladder that already has logged history.
- The disclaimer moves after limitations (audit) but stays a blocking, unskippable gate before
  any workout (§13.3): "Skip setup" must land on it, not past it.
- Progression rows are created by the first dashboard read (level 0) BEFORE onboarding answers,
  so the starting point must update existing rows, not only seed new ones.
- Migration numbers: 0042 is 51a's. 51b and 51c add none.
- TRAP: `finishOnboarding()` also sets hasAcknowledgedDisclaimer, and "Skip setup" calls it. With
  the disclaimer moved later, Skip must land ON the disclaimer; only the user's tap acknowledges it.
- HomeScreen shows the flow while `!hasAcknowledgedDisclaimer || onboardingInProgress`.
- 51c: picking Bands marks all five bands owned (the Your bands editor shows inline to correct it).
  A door ticks bands too. Skipping goes disclaimer -> Today (no primer, no reveal).
- `finishOnboarding` now returns false (no-op) until the disclaimer is acknowledged; only
  `acknowledgeDisclaimer` sets the flag.
