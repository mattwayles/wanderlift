/**
 * The Apple Watch contract: what the phone tells the watch, and what the watch asks of the phone.
 * Both travel as JSON strings over WatchConnectivity (modules/watch-connectivity is a generic pipe
 * and knows nothing about these shapes).
 *
 * The phone is authoritative. The watch mirrors `WatchState` and sends `WatchCommand`s; each
 * command is applied through the same handler the Workout screen's own button uses, so there is
 * one implementation of "complete a set". The Swift copy of these types lives in
 * `targets/watch/WatchProtocol.swift`; `watchProtocol.test.ts` fails if the two drift.
 *
 * Instants are epoch milliseconds, never dates, so the phone alone derives `local_date`.
 */

/** Bump when a field changes meaning. A watch that does not know the version shows "Update". */
export const WATCH_PROTOCOL_VERSION = 1;

export type WatchDifficulty = 'too_easy' | 'just_right' | 'too_hard';

/** The set on deck, or the one up next while resting. */
export interface WatchSet {
  /** "entryId:setIndex" — what a command names, so one for a set already left is ignored. */
  setKey: string;
  exerciseName: string;
  /** 0-based. */
  setIndex: number;
  sets: number;
  /** `reps` counts reps; `hold` runs a countdown of `target` seconds. */
  kind: 'reps' | 'hold';
  target: number;
  unilateral: boolean;
  /** "B3" or null for bodyweight. */
  band: string | null;
}

export interface WatchRest {
  startedAtMs: number;
  endsAtMs: number;
}

/** The difficulty question the phone would ask now, about the target. */
export interface WatchFeedback {
  question: string;
  current: WatchDifficulty | null;
}

export interface WatchActive {
  sessionId: string;
  /** "Upper · Medium". */
  title: string;
  paused: boolean;
  /** Counts up from here; `pausedElapsedSec` is the frozen number while paused. */
  elapsedAnchorMs: number;
  pausedElapsedSec: number | null;
  /** Completed sets over planned sets, 0..1. */
  progress: number;
  /** The set on deck, or null on the closing rest (nothing is up next). */
  set: WatchSet | null;
  /** Present between sets. */
  rest: WatchRest | null;
  feedback: WatchFeedback | null;
  /** True on the closing rest: the only way on is to stop. */
  closing: boolean;
}

/** A planned session the watch can start. */
export interface WatchReady {
  sessionId: string;
  title: string;
  exerciseCount: number;
  minutes: number;
  /** The workout was already started and left (paused, Home): Start picks it back up. */
  resuming: boolean;
}

export interface WatchState {
  v: typeof WATCH_PROTOCOL_VERSION;
  /** Increases with every send, so a late delivery never overwrites a newer state. */
  rev: number;
  /** What is going on: nothing to do, a plan waiting, or a workout running. */
  mode: 'idle' | 'ready' | 'active';
  ready: WatchReady | null;
  active: WatchActive | null;
}

export type WatchCommandBody =
  | { type: 'start'; sessionId: string }
  | { type: 'completeSet'; sessionId: string; setKey: string; reps?: number; seconds?: number }
  | { type: 'skipSet'; sessionId: string; setKey: string }
  | { type: 'pause'; sessionId: string }
  | { type: 'resume'; sessionId: string }
  | { type: 'skipRest'; sessionId: string }
  | { type: 'extendRest'; sessionId: string; deltaSec: number }
  | { type: 'rate'; sessionId: string; difficulty: WatchDifficulty }
  /** Stop: the watch has ended its HealthKit workout (`healthSaved`), the phone goes to Summary. */
  | { type: 'end'; sessionId: string; healthSaved: boolean };

export type WatchCommand = WatchCommandBody & {
  v: typeof WATCH_PROTOCOL_VERSION;
  /** Unique per command; redelivery is dropped. */
  id: string;
  atMs: number;
};

export const IDLE_STATE: Omit<WatchState, 'rev'> = {
  v: WATCH_PROTOCOL_VERSION,
  mode: 'idle',
  ready: null,
  active: null,
};

export function encodeState(state: WatchState): string {
  return JSON.stringify(state);
}

/** Parses a command from the watch; null for anything malformed or from a newer protocol. */
export function decodeCommand(json: string): WatchCommand | null {
  try {
    const raw = JSON.parse(json) as Partial<WatchCommand> | null;
    if (!raw || raw.v !== WATCH_PROTOCOL_VERSION) return null;
    if (typeof raw.id !== 'string' || typeof raw.type !== 'string') return null;
    return raw as WatchCommand;
  } catch {
    return null;
  }
}
