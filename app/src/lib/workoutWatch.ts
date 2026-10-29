/**
 * The active workout on the Apple Watch, phone side. Same shape as `workoutLiveActivity.ts`: the
 * Workout screen reports the set on deck, the rest page reports its window, and this file merges
 * them into a `WatchState` and sends it only when it actually differs from what the watch has.
 *
 * Two sources for "what is going on": a running workout (`publishActive`, from the Workout screen)
 * wins over a plan waiting to start or a workout left behind (`publishReady`, from the host in
 * App). The watch asks for things with `WatchCommand`s, which are handed to whatever registered a
 * handler for that type (`registerWatchHandlers`); nothing here applies a command itself, so there
 * is exactly one implementation of "complete a set" — the Workout screen's.
 *
 * Best-effort like the Live Activity: with no watch, no native module or an uninstalled watch app
 * every call is a quiet no-op, and the phone workout never depends on any of it.
 */
import * as WatchLink from '../../modules/watch-connectivity';
import {
  IDLE_STATE,
  WATCH_PROTOCOL_VERSION,
  decodeCommand,
  encodeState,
  type WatchActive,
  type WatchCommand,
  type WatchReady,
  type WatchSet,
  type WatchRest,
  type WatchHold,
  type WatchState,
} from './watchProtocol';

// ---- state to the watch ----

/** What the Workout screen knows; the rest window is merged in from the rest page. */
export type WatchActiveInput = Omit<WatchActive, 'rest' | 'hold'>;

let active: WatchActiveInput | null = null;
let rest: WatchRest | null = null;
let hold: WatchHold | null = null;
let ready: WatchReady | null = null;
let lastSent: string | null = null;
let rev = 0;
/** Sessions this launch has ended; a late render of the Workout screen must not bring them back. */
const endedSessionIds = new Set<string>();

/** The state for what is currently known. Pure apart from `rev`, which `flush` stamps. */
export function composeWatchState(
  input: WatchActiveInput | null,
  restWindow: WatchRest | null,
  readySession: WatchReady | null,
  holdTimer: WatchHold | null = null,
): Omit<WatchState, 'rev'> {
  if (input) {
    return {
      v: WATCH_PROTOCOL_VERSION,
      mode: 'active',
      ready: null,
      active: { ...input, rest: restWindow, hold: holdTimer },
    };
  }
  if (readySession) {
    return { ...IDLE_STATE, mode: 'ready', ready: readySession };
  }
  return IDLE_STATE;
}

function flush(): void {
  const body = composeWatchState(active, rest, ready, hold);
  const key = JSON.stringify(body);
  if (key === lastSent) return;
  lastSent = key;
  // Strictly increasing, so a state delivered late never overwrites a newer one.
  rev = Math.max(rev + 1, Date.now());
  try {
    WatchLink.sendState(encodeState({ ...body, rev }));
  } catch {
    // Best-effort: the screen is the source of truth and the wrist is a mirror of it.
  }
}

/** The Workout screen's half: call whenever anything the watch shows may have changed. Cheap to
 *  call on every render — unchanged state sends nothing. */
export function publishActive(next: WatchActiveInput): void {
  if (endedSessionIds.has(next.sessionId)) return;
  if (active && active.sessionId !== next.sessionId) {
    rest = null;
    hold = null;
  }
  active = next;
  flush();
}

/** The rest page's half: the window when a rest starts or its end moves, null when it is over. */
export function setWatchRest(next: WatchRest | null): void {
  rest = next;
  flush();
}

/** The timed set's half: the hold timer's phase and clock, null when no hold is on deck. */
export function setWatchHold(next: WatchHold | null): void {
  hold = next;
  flush();
}

/** The host's half: a plan waiting to start, or a workout left behind; null when there is neither. */
export function publishReady(next: WatchReady | null): void {
  ready = next;
  flush();
}

/** The Workout screen is gone (finished, abandoned, or navigated away): stop showing it. */
export function clearWatchActive(sessionId: string, ended: boolean): void {
  if (ended) endedSessionIds.add(sessionId);
  if (active?.sessionId !== sessionId) return;
  active = null;
  rest = null;
  hold = null;
  flush();
}

// ---- commands from the watch ----

type Handler = (command: WatchCommand) => void;
const handlers: Handler[] = [];

/** Handles every command the watch sends until the returned function is called. A command goes to
 *  every registered handler, which each ignore the types that are not theirs. */
export function registerWatchHandler(handler: Handler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i !== -1) handlers.splice(i, 1);
  };
}

/** Hands the commands the watch has sent since last time to the handlers, oldest first. Returns
 *  how many were dispatched. Safe to call at any time; the native side returns each one once. */
export function dispatchWatchCommands(): number {
  let commands: string[];
  try {
    commands = WatchLink.drainCommands();
  } catch {
    return 0;
  }
  let dispatched = 0;
  for (const json of commands) {
    const command = decodeCommand(json);
    if (!command) continue;
    dispatched++;
    for (const handler of [...handlers]) {
      try {
        handler(command);
      } catch {
        // One handler's failure must not swallow the command for the others.
      }
    }
  }
  return dispatched;
}

/** Whether the watch saved this session's workout to Health (it said so when it stopped). */
export function watchSavedHealth(sessionId: string): boolean {
  return WatchLink.hasFlag(`health:${sessionId}`);
}

export function rememberWatchSavedHealth(sessionId: string): void {
  WatchLink.setFlag(`health:${sessionId}`);
}

/** Forgets everything this module holds. Tests only. */
export function __resetWorkoutWatch(): void {
  active = null;
  rest = null;
  hold = null;
  ready = null;
  lastSent = null;
  rev = 0;
  endedSessionIds.clear();
  handlers.length = 0;
}

// ---- building the state ----

/** The set on deck, as the watch shows it. `band` is a plain label ("B3"), null for bodyweight. */
export function watchSetFor(
  entry: {
    id: string;
    sets: number;
    repTarget: number | null;
    durationSec: number | null;
    unilateral: boolean;
  },
  setIndex: number,
  exerciseName: string,
  band: string | null,
): WatchSet {
  const reps = entry.repTarget != null;
  return {
    setKey: `${entry.id}:${setIndex}`,
    exerciseName,
    setIndex,
    sets: entry.sets,
    kind: reps ? 'reps' : 'hold',
    target: reps ? (entry.repTarget as number) : (entry.durationSec ?? 0),
    unilateral: entry.unilateral,
    band,
  };
}
