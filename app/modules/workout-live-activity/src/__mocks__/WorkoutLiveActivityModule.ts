/**
 * Jest stand-in for the native Live Activity module, installed for every test by `jest.setup.js` so
 * app tests never reach native code. An in-memory fake of the same contract: at most one workout
 * activity, `start` replaces another session's, `update` needs an existing one. Every call is also
 * recorded so tests can assert on what would have been shown.
 */
import type { WorkoutActivityState } from '../../index';

interface FakeActivity {
  sessionId: string;
  title: string;
  state: WorkoutActivityState;
}

type Call =
  | { fn: 'start'; sessionId: string; title: string; state: WorkoutActivityState }
  | { fn: 'update'; sessionId: string; state: WorkoutActivityState }
  | { fn: 'end'; sessionId: string | null };

interface FakeState {
  enabled: boolean;
  activities: FakeActivity[];
  calls: Call[];
}

let state: FakeState = fresh();

function fresh(): FakeState {
  return { enabled: true, activities: [], calls: [] };
}

export default {
  areEnabled(): boolean {
    return state.enabled;
  },

  activeSessionIds(): string[] {
    return state.activities.map((a) => a.sessionId);
  },

  async start(sessionId: string, title: string, s: WorkoutActivityState): Promise<boolean> {
    state.calls.push({ fn: 'start', sessionId, title, state: s });
    state.activities = state.activities.filter((a) => a.sessionId === sessionId);
    const existing = state.activities[0];
    if (existing) {
      existing.state = s;
      return true;
    }
    if (!state.enabled) return false;
    state.activities.push({ sessionId, title, state: s });
    return true;
  },

  async update(sessionId: string, s: WorkoutActivityState): Promise<boolean> {
    state.calls.push({ fn: 'update', sessionId, state: s });
    const existing = state.activities.find((a) => a.sessionId === sessionId);
    if (!existing) return false;
    existing.state = s;
    return true;
  },

  async end(sessionId: string | null): Promise<void> {
    state.calls.push({ fn: 'end', sessionId });
    state.activities = state.activities.filter(
      (a) => sessionId !== null && a.sessionId !== sessionId,
    );
  },

  // ---- test helpers (not part of the native contract) ----

  /** Back to enabled, nothing showing, no calls recorded. */
  __reset(): void {
    state = fresh();
  },
  __setEnabled(enabled: boolean): void {
    state.enabled = enabled;
  },
  /** The activity currently showing, if any. */
  __current(): FakeActivity | null {
    return state.activities[0] ?? null;
  },
  /** Puts an activity up directly, as if left over from an earlier launch. */
  __seed(sessionId: string, title: string, s: WorkoutActivityState): void {
    state.activities = [{ sessionId, title, state: s }];
  },
  __calls(): Call[] {
    return state.calls;
  },
};
