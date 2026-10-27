/**
 * The active workout on the Dynamic Island and the Lock Screen (a Live Activity). Display only:
 * the exercise on deck, its set, the elapsed workout clock and, between sets, the rest countdown.
 *
 * Two sources feed it, because they know different things. The Workout screen knows the session
 * (`showWorkout`): which set is on deck, whether the clock is paused. The rest page knows when the
 * rest it is running will end (`setRestWindow`) — ±15s and Skip change that without touching the
 * session row. This file merges the two and sends the result to the native module only when it
 * actually differs from what is showing. The widget runs the clocks itself from the instants it
 * is given, so nothing here ticks.
 *
 * Same rule as `workoutNotifications.ts`: all of it is best-effort. Live Activities switched off,
 * unsupported, or a native call that fails never reaches the workout — the screen is the source
 * of truth and the Island is a mirror of it.
 */
import type { Difficulty } from '@roamfit/engine';
import type { Focus } from '@roamfit/data';
import { sessionsRepo } from '@roamfit/store';
import type { SessionRecord } from '@roamfit/store';
import * as LiveActivity from '../../modules/workout-live-activity';
import type { WorkoutActivityState } from '../../modules/workout-live-activity';
import { DIFFICULTY_LABELS, FOCUS_LABELS } from './focusLabels';
import { sessionCompletionFraction } from './sessionProgress';

/** Everything the activity shows except the rest window. */
export interface WorkoutOnDeck {
  sessionId: string;
  title: string;
  exerciseName: string;
  setLabel: string;
  elapsedAnchorMs: number;
  pausedElapsedSec: number | null;
  progress: number;
}

/** The rest the rest page is running, as absolute instants (epoch ms). */
export interface RestWindow {
  startedAtMs: number;
  endsAtMs: number;
}

/** "Upper · Medium" — fixed for the life of the activity. */
export function workoutActivityTitle(focus: Focus, difficulty: Difficulty): string {
  return `${FOCUS_LABELS[focus]} · ${DIFFICULTY_LABELS[difficulty]}`;
}

/**
 * The on-deck half, derived only from what is persisted on the session row — never from "now" —
 * so the same session always maps to the same value and an unchanged screen re-render sends
 * nothing. The elapsed clock's anchor is `startedAt` pushed forward by the pauses already closed,
 * which is the instant a clock started at zero would have to begin at to read `activeElapsedSec`
 * now. While paused the number is frozen at the pause, and the widget shows it without ticking.
 */
export function onDeckFor(
  session: SessionRecord,
  exerciseName: string,
  setIndex: number,
  sets: number,
): WorkoutOnDeck {
  const started = session.startedAt != null;
  const pausedElapsedSec = !started
    ? 0
    : session.pausedAt != null
      ? Math.floor(sessionsRepo.activeElapsedSec(session, session.pausedAt))
      : null;
  return {
    sessionId: session.id,
    title: workoutActivityTitle(session.focus, session.difficulty),
    exerciseName,
    setLabel: `Set ${setIndex + 1} of ${sets}`,
    elapsedAnchorMs: started
      ? Date.parse(session.startedAt as string) + session.pausedTotalSec * 1000
      : 0,
    pausedElapsedSec,
    progress: sessionCompletionFraction(session),
  };
}

/** What the native module is handed: the on-deck state plus the rest window, if resting. */
export function composeActivityState(
  onDeck: WorkoutOnDeck,
  rest: RestWindow | null,
): WorkoutActivityState {
  return {
    exerciseName: onDeck.exerciseName,
    setLabel: onDeck.setLabel,
    resting: rest != null,
    elapsedAnchorMs: onDeck.elapsedAnchorMs,
    pausedElapsedSec: onDeck.pausedElapsedSec,
    restStartedAtMs: rest?.startedAtMs ?? null,
    restEndsAtMs: rest?.endsAtMs ?? null,
    progress: onDeck.progress,
  };
}

let onDeck: WorkoutOnDeck | null = null;
let rest: RestWindow | null = null;
/** The session whose activity this app launch has started (or adopted), and what it last sent. */
let shownSessionId: string | null = null;
let lastSent: string | null = null;
/** Native calls run one after another, so an end can never overtake the update before it. */
let queue: Promise<void> = Promise.resolve();

function enqueue(work: () => Promise<unknown>): void {
  queue = queue.then(work).then(
    () => undefined,
    () => undefined,
  );
}

function flush(): void {
  if (!onDeck) return;
  const sessionId = onDeck.sessionId;
  const title = onDeck.title;
  const state = composeActivityState(onDeck, rest);
  const key = `${sessionId}|${JSON.stringify(state)}`;
  if (key === lastSent) return;
  lastSent = key;
  if (shownSessionId === sessionId) {
    enqueue(() => LiveActivity.update(sessionId, state));
  } else {
    shownSessionId = sessionId;
    // `start` also updates an activity this session already has (one left from before the app
    // was killed), and ends any other workout's. Refused (Live Activities switched off), the
    // next change asks again, so switching them on mid-workout picks up from the next set.
    enqueue(async () => {
      const shown = await LiveActivity.start(sessionId, title, state);
      if (!shown && shownSessionId === sessionId) shownSessionId = null;
    });
  }
}

/** The Workout screen's half: call whenever the set on deck, the pause or the progress may have
 *  changed. Cheap to call on every render — unchanged state sends nothing. */
export function showWorkout(next: WorkoutOnDeck): void {
  if (onDeck && onDeck.sessionId !== next.sessionId) rest = null;
  onDeck = next;
  flush();
}

/** The rest page's half: the window when a rest starts or its end moves, null when it is over. */
export function setRestWindow(next: RestWindow | null): void {
  rest = next;
  flush();
}

/** The workout is over (completed or abandoned): take it off the Island and the Lock Screen. */
export function endWorkoutActivity(): void {
  onDeck = null;
  rest = null;
  shownSessionId = null;
  lastSent = null;
  enqueue(() => LiveActivity.end(null));
}

/**
 * Ends any workout activity whose session is no longer active — one left behind when the app was
 * killed, or a workout finished on another path. Run at launch and on return to the foreground.
 */
export function reconcileWorkoutActivities(isActiveSession: (sessionId: string) => boolean): void {
  let ids: string[];
  try {
    ids = LiveActivity.activeSessionIds();
  } catch {
    return;
  }
  for (const id of ids) {
    if (isActiveSession(id)) continue;
    if (id === shownSessionId) {
      onDeck = null;
      rest = null;
      shownSessionId = null;
      lastSent = null;
    }
    enqueue(() => LiveActivity.end(id));
  }
}

/** Waits for every queued native call. Tests only. */
export function __flushLiveActivityQueue(): Promise<void> {
  return queue;
}

/** Forgets everything this module holds. Tests only. */
export function __resetLiveActivity(): void {
  onDeck = null;
  rest = null;
  shownSessionId = null;
  lastSent = null;
  queue = Promise.resolve();
}
