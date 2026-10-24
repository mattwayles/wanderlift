## Track: 51b — Onboarding step components (standalone, not wired)

Last updated: 2026-10-24

### Done

- [x] Ramp-up read
- [x] ValueScreens + PlanReveal + weekDays helper, tested (4b82515)
- [x] NotificationPrimer, tested

### In progress

- Nothing. Track complete; components are not wired into OnboardingFlow.

### Next

- Wiring agent: drop `app/src/components/onboarding/*` into the rebuilt flow.

### Decisions / gotchas

- Props-driven; no store writes, no permission requests (caller does that in `onEnable`).
- Week math is string-only via the engine's `addDays`; weekday names come from `weekdayIndex` (calendar arithmetic, no Date/tz).
- PlanReveal takes an optional `today` (defaults to `nowEngineClock().today`) so tests are deterministic.
- NotificationPrimer uses the picker's `onValueChange` (Settings still uses the deprecated `onChange`).
- Testing: React 19 async act — do not fire two events back to back; await a state-visible change between them.
- STATUS-51-onboarding.md was not present in this worktree. No new dependencies.
