## Track: 49 — Journey polish + Passport blank page
Last updated: 2026-10-23

### Done
- (none yet)

### In progress
- 49a: Passport blank page. Cause: PassportScreen never calls useDashboardData's `reload()`
  (the hook does not load on its own); data stays undefined and the screen renders an empty
  <Screen>. Tests mocked the hook with data, so they never saw it. Fix: useFocusEffect(reload),
  as BadgesScreen does.

### Next
- 49b: the "Each step is one small upgrade..." caption (components/TrailProgressChart.tsx) shows
  under every Trail chart. Show it once, in the Trails section (JourneyScreen), not per chart.
- 49c: Best set view in TrailProgressChart: one stat tile per exercise instead of name/value rows.
- 49d: Badges card on Journey gets an "Open your badges ›" line like the Passport card's.

### Decisions / gotchas
- ExerciseDetailScreen has its own (different) ladder caption; it is out of scope here.
