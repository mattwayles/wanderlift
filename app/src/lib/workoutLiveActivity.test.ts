/**
 * The Live Activity mirror: the pure mapping from a session to what the Island shows, and the
 * controller's send discipline (start once, update only on change, end, reconcile). Runs against
 * the in-memory native fake installed by `jest.setup.js` — it proves what would be sent, not how
 * the widget draws it (that needs a device; see STATUS-live-activity.md).
 */
import type { SessionRecord } from '@roamfit/store';
import LiveActivityMock from '../../modules/workout-live-activity/src/WorkoutLiveActivityModule';
import {
  __flushLiveActivityQueue,
  __resetLiveActivity,
  composeActivityState,
  endWorkoutActivity,
  onDeckFor,
  reconcileWorkoutActivities,
  setRestWindow,
  showWorkout,
} from './workoutLiveActivity';

const mock = LiveActivityMock as unknown as {
  __reset(): void;
  __setEnabled(enabled: boolean): void;
  __current(): { sessionId: string; title: string; state: Record<string, unknown> } | null;
  __seed(sessionId: string, title: string, state: unknown): void;
  __calls(): { fn: string; sessionId: string | null }[];
};

const STARTED = '2026-10-27T10:00:00.000Z';

function entry(id: string, sets: number, logged: number) {
  return {
    id,
    sets,
    entryStatus: 'planned',
    setLogs: Array.from({ length: logged }, (_, i) => ({ setIndex: i, status: 'completed' })),
  };
}

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's1',
    status: 'active',
    focus: 'upper',
    difficulty: 'medium',
    startedAt: STARTED,
    pausedAt: null,
    pausedTotalSec: 0,
    entries: [entry('e1', 3, 1), entry('e2', 1, 0)],
    ...overrides,
  } as unknown as SessionRecord;
}

beforeEach(() => {
  mock.__reset();
  __resetLiveActivity();
});

describe('onDeckFor', () => {
  it('titles the activity by focus and difficulty and labels the set on deck', () => {
    const d = onDeckFor(session(), 'Band row', 1, 3);
    expect(d.title).toBe('Upper · Medium');
    expect(d.exerciseName).toBe('Band row');
    expect(d.setLabel).toBe('Set 2 of 3');
    expect(d.progress).toBeCloseTo(1 / 4);
  });

  it('anchors the running clock at the start pushed forward by closed pauses', () => {
    const d = onDeckFor(session({ pausedTotalSec: 90 }), 'Band row', 0, 3);
    expect(d.elapsedAnchorMs).toBe(Date.parse(STARTED) + 90_000);
    expect(d.pausedElapsedSec).toBeNull();
  });

  it('freezes the number at the pause instead of ticking', () => {
    const d = onDeckFor(
      session({ pausedAt: '2026-10-27T10:12:30.000Z', pausedTotalSec: 30 }),
      'Band row',
      0,
      3,
    );
    expect(d.pausedElapsedSec).toBe(12 * 60 + 30 - 30);
  });

  it('depends only on the row, so the same session maps to the same value at any moment', () => {
    const now = jest.spyOn(Date, 'now');
    const a = onDeckFor(session(), 'Band row', 0, 3);
    now.mockReturnValue(Date.parse(STARTED) + 3_600_000);
    const b = onDeckFor(session(), 'Band row', 0, 3);
    now.mockRestore();
    expect(b).toEqual(a);
  });
});

describe('composeActivityState', () => {
  it('is resting exactly when a rest window is given', () => {
    const d = onDeckFor(session(), 'Band row', 1, 3);
    expect(composeActivityState(d, null)).toMatchObject({
      resting: false,
      restStartedAtMs: null,
      restEndsAtMs: null,
    });
    expect(composeActivityState(d, { startedAtMs: 1000, endsAtMs: 61_000 })).toMatchObject({
      resting: true,
      restStartedAtMs: 1000,
      restEndsAtMs: 61_000,
    });
  });
});

describe('controller', () => {
  it('starts once, then updates only when what is shown changes', async () => {
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    await __flushLiveActivityQueue();
    expect(mock.__calls().map((c) => c.fn)).toEqual(['start']);
    expect(mock.__current()?.title).toBe('Upper · Medium');

    setRestWindow({ startedAtMs: 1000, endsAtMs: 61_000 });
    setRestWindow({ startedAtMs: 1000, endsAtMs: 61_000 });
    await __flushLiveActivityQueue();
    expect(mock.__calls().map((c) => c.fn)).toEqual(['start', 'update']);
    expect(mock.__current()?.state).toMatchObject({ resting: true, restEndsAtMs: 61_000 });

    setRestWindow(null);
    await __flushLiveActivityQueue();
    expect(mock.__current()?.state).toMatchObject({ resting: false });
  });

  it('a rest window without a workout on deck sends nothing', async () => {
    setRestWindow({ startedAtMs: 1000, endsAtMs: 61_000 });
    await __flushLiveActivityQueue();
    expect(mock.__calls()).toEqual([]);
  });

  it('ends the activity when the workout is over', async () => {
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    endWorkoutActivity('s1');
    await __flushLiveActivityQueue();
    expect(mock.__current()).toBeNull();
  });

  it('a late render of the ended session does not bring it back', async () => {
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    endWorkoutActivity('s1');
    showWorkout(onDeckFor(session(), 'Band row', 2, 3));
    await __flushLiveActivityQueue();
    expect(mock.__current()).toBeNull();
    expect(mock.__calls().map((c) => c.fn)).toEqual(['start', 'end']);
  });

  it('with Live Activities off, asks again on the next change rather than updating nothing', async () => {
    mock.__setEnabled(false);
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    await __flushLiveActivityQueue();
    expect(mock.__current()).toBeNull();

    mock.__setEnabled(true);
    showWorkout(onDeckFor(session(), 'Band row', 2, 3));
    await __flushLiveActivityQueue();
    expect(mock.__calls().map((c) => c.fn)).toEqual(['start', 'start']);
    expect(mock.__current()?.state).toMatchObject({ setLabel: 'Set 3 of 3' });
  });

  it('reconcile ends activities whose session is no longer active and keeps the live one', async () => {
    mock.__seed('gone', 'Legs · Easy', {});
    reconcileWorkoutActivities((id) => id !== 'gone');
    await __flushLiveActivityQueue();
    expect(mock.__current()).toBeNull();

    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    await __flushLiveActivityQueue();
    reconcileWorkoutActivities(() => true);
    await __flushLiveActivityQueue();
    expect(mock.__current()?.sessionId).toBe('s1');
  });

  it('after reconcile ends the shown session, showing it again starts afresh', async () => {
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    await __flushLiveActivityQueue();
    reconcileWorkoutActivities(() => false);
    showWorkout(onDeckFor(session(), 'Band row', 1, 3));
    await __flushLiveActivityQueue();
    expect(mock.__calls().map((c) => c.fn)).toEqual(['start', 'end', 'start']);
    expect(mock.__current()?.sessionId).toBe('s1');
  });
});
