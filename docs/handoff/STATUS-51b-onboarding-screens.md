## Track: 51b — Onboarding step components (standalone, not wired)
Last updated: 2026-10-24
### Done
- [x] Ramp-up read (CLAUDE.md, ui kit, Enter/useReduceMotion, Settings time picker)
### In progress
- ValueScreens, then PlanReveal (+ weekDays helper), then NotificationPrimer, in app/src/components/onboarding/, each with a test beside it
### Next
- Final `npm run check`, report to orchestrator
### Decisions / gotchas
- Components are props-driven; no store writes, no permission requests. OnboardingFlow.tsx untouched.
- Week-day helper uses string-only date math (engine `addDays`/`daysBetween`, which anchor at UTC midnight purely as a calendar engine) — no tz conversion.
- STATUS-51-onboarding.md was not present in this worktree.
