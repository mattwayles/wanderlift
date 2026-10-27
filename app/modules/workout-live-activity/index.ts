import WorkoutLiveActivityNative from './src/WorkoutLiveActivityModule';

/**
 * The active workout as a Live Activity: the Dynamic Island and the Lock Screen. Display only, and
 * updated locally — there is no push channel. App code goes through `src/lib/workoutLiveActivity.ts`,
 * which decides when to call these and swallows their failures. Without the native module (a dev
 * client built before it existed) every call is a quiet no-op.
 */

/** What the activity shows. Mirrors `WorkoutActivityAttributes.ContentState` in Swift; instants
 *  are epoch milliseconds. */
export interface WorkoutActivityState {
  /** The exercise on deck: the one being done, or the one up next while resting. */
  exerciseName: string;
  /** "Set 2 of 4" for that exercise. */
  setLabel: string;
  resting: boolean;
  /** The elapsed workout clock counts up from here (start plus time spent paused). */
  elapsedAnchorMs: number;
  /** While paused: the elapsed seconds to show, frozen. Null while the clock runs. */
  pausedElapsedSec: number | null;
  restStartedAtMs: number | null;
  restEndsAtMs: number | null;
  /** Completed sets over planned sets, 0..1. */
  progress: number;
}

/** Whether the user currently allows Live Activities for the app. */
export function areEnabled(): boolean {
  return WorkoutLiveActivityNative?.areEnabled() ?? false;
}

/** Session ids of the workout activities currently running. */
export function activeSessionIds(): string[] {
  return WorkoutLiveActivityNative?.activeSessionIds() ?? [];
}

/** Shows the workout (ending any other workout's activity), or updates it if already shown.
 *  Resolves false when the system will not show it. */
export function start(
  sessionId: string,
  title: string,
  state: WorkoutActivityState,
): Promise<boolean> {
  return WorkoutLiveActivityNative?.start(sessionId, title, state) ?? Promise.resolve(false);
}

/** Replaces what this session's activity shows. False if it has none. */
export function update(sessionId: string, state: WorkoutActivityState): Promise<boolean> {
  return WorkoutLiveActivityNative?.update(sessionId, state) ?? Promise.resolve(false);
}

/** Ends this session's activity at once, or every workout activity when `sessionId` is null. */
export function end(sessionId: string | null): Promise<void> {
  return WorkoutLiveActivityNative?.end(sessionId) ?? Promise.resolve();
}
