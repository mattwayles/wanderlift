## Track: 48 — "Video demo coming soon" in How to
Last updated: 2026-10-23
Files: app/src/components/HowToDemo.tsx (was HowToVideoButton.tsx), its test, and the three
call sites: ExerciseDetailScreen (How to card), WorkoutScreen Disclosure (exercise + rest pages).

Why: shipping before the per-exercise clips exist. Every How to section shows a "coming soon"
tile; online, the YouTube search button stays under an "In the meantime" label.

### Done
- [x] HowToDemo: coming-soon tile always, 'In the meantime' + YouTube search online; on detail, exercise and rest pages

### In progress
- none. Simulator/device look owed.

### Next
- When real clips land, the tile is where the bundled player goes (offline, no network).

### Decisions / gotchas
- One shared component, so all three screens change together. Button label stays "Watch a demo".
- Copy is a promise, not an apology (never-punish tone).
