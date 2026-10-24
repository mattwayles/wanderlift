/**
 * Track 50b — asking for an App Store rating, once, at a good moment: right after the user taps
 * "Heck yes!" to leave the workout completion screen. Apple's native sheet only — no pre-prompt,
 * no "enjoying the app?" gate. Apple caps the sheet at three a year on its own; this adds ours:
 * at most once per app version, and never within 120 days of the last ask.
 *
 * The rule is a pure function (`shouldAskForReview`); `maybeRequestReview` is the thin impure
 * shell. `expo-store-review` is lazy-loaded exactly like `expo-network` in `networkStatus.ts` —
 * its native module isn't registered under Jest — and every failure degrades to "don't ask."
 * All date math is `local_date` strings (invariant 6), never UTC.
 */
import { usersRepo, type Db } from '@roamfit/store';
import { appVersion } from './appInfo';
import { nowUtcInstant } from './localClock';

/** Completed workouts at which the user is, on count alone, warmed up enough to be asked. */
export const REVIEW_MIN_WORKOUTS = 3;
/** Minimum calendar days between two asks. */
export const REVIEW_MIN_DAYS_BETWEEN = 120;

export interface ReviewPromptInputs {
  /** Completed workouts including the one just finished. */
  completedWorkouts: number;
  /** This session produced a level-up. */
  levelledUp: boolean;
  lastAskedLocalDate: string | null;
  lastAskedVersion: string | null;
  currentVersion: string;
  todayLocalDate: string;
}

/** Whole calendar days from `from` to `to` (both `YYYY-MM-DD` local dates). */
function daysBetween(from: string, to: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export function shouldAskForReview(i: ReviewPromptInputs): boolean {
  if (i.completedWorkouts < REVIEW_MIN_WORKOUTS && !i.levelledUp) return false;
  if (i.lastAskedVersion === i.currentVersion) return false;
  if (
    i.lastAskedLocalDate !== null &&
    daysBetween(i.lastAskedLocalDate, i.todayLocalDate) < REVIEW_MIN_DAYS_BETWEEN
  ) {
    return false;
  }
  return true;
}

type StoreReviewModule = typeof import('expo-store-review');

let storeReviewCache: StoreReviewModule | null | undefined;

function loadStoreReview(): StoreReviewModule | null {
  if (storeReviewCache !== undefined) return storeReviewCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storeReviewCache = require('expo-store-review') as StoreReviewModule;
  } catch {
    storeReviewCache = null;
  }
  return storeReviewCache;
}

/** Fire and forget from the "Heck yes!" press: decides, then asks Apple for the sheet. Never
 *  throws and never needs awaiting — navigation must not wait on it. */
export async function maybeRequestReview(
  db: Db,
  input: { completedWorkouts: number; levelledUp: boolean; todayLocalDate: string },
): Promise<void> {
  try {
    const user = usersRepo.getUser(db);
    const currentVersion = appVersion();
    if (
      !shouldAskForReview({
        completedWorkouts: input.completedWorkouts,
        levelledUp: input.levelledUp,
        lastAskedLocalDate: user?.reviewPromptLastAskedDate ?? null,
        lastAskedVersion: user?.reviewPromptLastAskedVersion ?? null,
        currentVersion,
        todayLocalDate: input.todayLocalDate,
      })
    ) {
      return;
    }
    const storeReview = loadStoreReview();
    if (!storeReview || !(await storeReview.isAvailableAsync())) return;
    // Record before asking: if the sheet throws, we still don't nag again.
    usersRepo.updateUser(
      db,
      {
        reviewPromptLastAskedDate: input.todayLocalDate,
        reviewPromptLastAskedVersion: currentVersion,
      },
      nowUtcInstant(),
    );
    await storeReview.requestReview();
  } catch {
    // A rating prompt is never worth surfacing an error.
  }
}
