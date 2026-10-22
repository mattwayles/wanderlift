## Track: 47 — Muscle map legibility
Last updated: 2026-10-22
Files: app/src/lib/svgPathBounds.ts (new), app/src/lib/muscleMap.ts, app/src/components/MuscleMap.tsx,
app/src/screens/ExercisesScreen.tsx (row tile), app/src/screens/ExerciseDetailScreen.tsx, tests beside each.

Why: on a device the row figure (full body in ~14pt wide) makes small muscles 2-4pt and the faded
secondary fill vanishes on the tinted tile. User asked for: zoom to the worked region, stronger
contrast, tile stays 52pt (NOT bigger yet), full labelled map on the detail screen.

### Done
- (none yet)

### In progress
- 47a: svgPathBounds + `focusBox` in lib/muscleMap.ts, `zoom` on MuscleMap, row tile neutral surface2.

### Next
- 47b: "Muscles worked" card on ExerciseDetailScreen (front + back figures, primary/secondary legend).
- Remove the matching Field Guide items from docs/BACKLOG.md if they land (detail-header map).

### Decisions / gotchas
- Crop is a square viewBox around the primary muscles' bounds (secondary if no primary, whole
  figure if neither), padded, min side so a forearm is not magnified absurdly. Each side's paths
  only contain that side, so a wide crop never shows the other figure.
- Row tile moves from the focus tint to neutral surface2 so a faded secondary fill reads; the
  primary muscles still carry the focus accent.
