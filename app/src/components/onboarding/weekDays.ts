/**
 * Track 51b — the "Your first week" strip. Pure string date math on `local_date`s (invariant 6):
 * the engine's `addDays` treats a `YYYY-MM-DD` as a calendar day only, so there is no timezone
 * or DST conversion anywhere in here.
 */
import { addDays } from '@roamfit/engine';

export const WEEK_LENGTH = 7;

/** Gaps (in days) that spread `count` sessions over a week, starting on day 0. */
const OFFSETS: Record<number, readonly number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 2, 4, 5],
};

/**
 * Suggested training days for the 7 days starting `today`, spaced so rest days sit between
 * sessions. `count` is clamped to 1-4 (a first week never asks for more). Always includes today.
 */
export function suggestedTrainingDays(today: string, count: number): string[] {
  const n = Math.min(4, Math.max(1, Math.round(Number.isFinite(count) ? count : 3)));
  return OFFSETS[n].map((o) => addDays(today, o));
}

export interface WeekDay {
  /** `YYYY-MM-DD` local date. */
  date: string;
  /** Three-letter weekday, from the date's own calendar position (no timezone involved). */
  weekday: string;
  /** Day of month. */
  dayOfMonth: number;
  isToday: boolean;
  /** A suggested session day; the others are rest, shown as rest. */
  isTraining: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Day of week (0 = Sunday) of a `YYYY-MM-DD`, by Zeller-style calendar arithmetic. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

/** The seven days from `today`, each flagged training or rest. */
export function firstWeek(today: string, count: number): WeekDay[] {
  const training = new Set(suggestedTrainingDays(today, count));
  return Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      weekday: WEEKDAYS[weekdayIndex(date)],
      dayOfMonth: Number(date.slice(8, 10)),
      isToday: i === 0,
      isTraining: training.has(date),
    };
  });
}
