/**
 * The Apple Watch driving the real WorkoutScreen: what the screen sends the watch, and each command
 * the watch can send applied by the screen's own handlers (complete, ±15s, pause, skip rest, rate,
 * stop). Asserts on the in-memory native fake (`jest.setup.js`); the watch app itself needs a device
 * (STATUS-watch-app.md).
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { createRng, seedFromString } from '@roamfit/engine';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { exerciseStateRepo, generate, schema, sessionsRepo, usersRepo } from '@roamfit/store';
import { eq } from 'drizzle-orm';
import WorkoutScreen from './WorkoutScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import { fastForwardTo } from './timedTestHelpers';
import { __resetLiveActivity } from '../lib/workoutLiveActivity';
import { __resetWorkoutWatch, dispatchWatchCommands } from '../lib/workoutWatch';
import { WATCH_PROTOCOL_VERSION, type WatchState } from '../lib/watchProtocol';
import WatchMock from '../../modules/watch-connectivity/src/WatchConnectivityModule';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

const mock = WatchMock as unknown as {
  __reset(): void;
  __receiveSilently(json: string): void;
  __sent(): string[];
};

const lastState = (): WatchState => JSON.parse(mock.__sent().at(-1)!) as WatchState;

let seq = 0;
/** A command from the watch, delivered the way the host would: queued, then drained. */
async function fromWatch(body: Record<string, unknown>) {
  mock.__receiveSilently(
    JSON.stringify({ v: WATCH_PROTOCOL_VERSION, id: `cmd-${++seq}`, atMs: Date.now(), ...body }),
  );
  await act(async () => {
    dispatchWatchCommands();
  });
}

function mockNavigation() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };
}

function Setup({ onReady }: { onReady: (db: ReturnType<typeof useStore>['db']) => void }) {
  const { db } = useStore();
  const pending = sessionsRepo.getPendingSession(db);
  if (pending) sessionsRepo.discardSession(db, pending.id, {}, new Date().toISOString());
  onReady(db);
  return null;
}

beforeEach(() => {
  mock.__reset();
  __resetWorkoutWatch();
  __resetLiveActivity();
});

it('shows the workout on the watch and applies what the watch asks for', async () => {
  let db!: ReturnType<typeof useStore>['db'];
  render(
    <StoreProvider>
      <Setup onReady={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);

  const clock = nowEngineClock();
  const utcInstant = nowUtcInstant();
  const { plan, comebackTier, recoveryWeekManual } = generate(db, {
    library: exerciseLibrary,
    families: familyLibrary,
    request: { focus: 'full', difficulty: 'medium', targetMinutes: 30 },
    clock,
    rng: createRng(seedFromString('watch-test-seed')),
    utcInstant,
  });
  const sessionId = sessionsRepo.createPendingSession(db, {
    plan,
    utcInstant,
    localDate: clock.today,
    tzId: clock.tzId,
    comebackTier,
    recoveryWeekManual,
  });
  sessionsRepo.startSession(db, sessionId, nowUtcInstant());
  usersRepo.updateUser(db, { feedbackPromptEnabled: false }, nowUtcInstant());

  const session = sessionsRepo.getSession(db, sessionId)!;
  const repsEntry = session.entries.find(
    (e) => e.section === 'main' && e.durationSec == null && e.entryStatus !== 'removed_at_approval',
  )!;
  db.update(schema.sessionEntries)
    .set({ sets: 2, restSec: 60 })
    .where(eq(schema.sessionEntries.id, repsEntry.id))
    .run();
  fastForwardTo(db, session, repsEntry.id);
  const name = exerciseLibrary.exercises.find((e) => e.id === repsEntry.exerciseId)!.name;

  const navigation = mockNavigation();
  render(
    <StoreProvider>
      <WorkoutScreen
        navigation={navigation as never}
        route={{ key: 'Workout', name: 'Workout', params: { sessionId } } as never}
      />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('complete-set')).toBeTruthy(), WAIT_OPTS);

  const setLog = (setIndex: number) =>
    sessionsRepo
      .getSession(db, sessionId)!
      .entries.find((e) => e.id === repsEntry.id)!
      .setLogs.find((l) => l.setIndex === setIndex);

  // The watch is shown the set on deck: named, keyed, targeted.
  let state = lastState();
  expect(state.mode).toBe('active');
  expect(state.active).toMatchObject({
    sessionId,
    title: 'Full body · Medium',
    paused: false,
    closing: false,
    rest: null,
    feedback: null,
    set: {
      setKey: `${repsEntry.id}:0`,
      exerciseName: name,
      setIndex: 0,
      sets: 2,
      kind: 'reps',
      target: repsEntry.repTarget,
    },
  });

  // A command for a set the phone is not on is ignored.
  await fromWatch({ type: 'completeSet', sessionId, setKey: `${repsEntry.id}:1`, reps: 5 });
  expect(setLog(0)).toBeUndefined();
  expect(screen.queryByTestId('rest-circle')).toBeNull();

  // Complete the set from the wrist, with the reps the crown set.
  await fromWatch({ type: 'completeSet', sessionId, setKey: `${repsEntry.id}:0`, reps: 9 });
  await waitFor(() => expect(screen.getByTestId('rest-circle')).toBeTruthy(), WAIT_OPTS);
  expect(setLog(0)).toMatchObject({ status: 'completed', repsActual: 9 });
  state = lastState();
  expect(state.active?.set?.setKey).toBe(`${repsEntry.id}:1`);
  expect(state.active?.rest).not.toBeNull();
  const endsAt = state.active!.rest!.endsAtMs;

  // Redelivered or late, the same completion changes nothing.
  await fromWatch({ type: 'completeSet', sessionId, setKey: `${repsEntry.id}:0`, reps: 9 });
  expect(setLog(1)).toBeUndefined();

  // +15s moves the rest's end, and is recorded as the fatigue signal the button records.
  await fromWatch({ type: 'extendRest', sessionId, deltaSec: 15 });
  await waitFor(
    () => expect(lastState().active!.rest!.endsAtMs).toBeGreaterThan(endsAt + 10_000),
    WAIT_OPTS,
  );
  expect(setLog(0)?.restExtendedCount).toBe(1);

  // Pause and resume freeze and restart the workout clock.
  await fromWatch({ type: 'pause', sessionId });
  await waitFor(() => expect(lastState().active!.paused).toBe(true), WAIT_OPTS);
  expect(sessionsRepo.getSession(db, sessionId)!.pausedAt).not.toBeNull();
  await fromWatch({ type: 'resume', sessionId });
  await waitFor(() => expect(lastState().active!.paused).toBe(false), WAIT_OPTS);

  // Skipping the rest moves on to the next set.
  await fromWatch({ type: 'skipRest', sessionId });
  await waitFor(() => expect(screen.getByTestId('complete-set')).toBeTruthy(), WAIT_OPTS);
  expect(lastState().active?.rest).toBeNull();
  expect(lastState().active?.set?.setKey).toBe(`${repsEntry.id}:1`);

  // Completing the exercise's last set, even while paused, asks how the target was; the watch
  // answers it. (A paused clock is resumed, not questioned: the user is plainly training.)
  await fromWatch({ type: 'pause', sessionId });
  await waitFor(() => expect(lastState().active!.paused).toBe(true), WAIT_OPTS);
  await fromWatch({ type: 'completeSet', sessionId, setKey: `${repsEntry.id}:1` });
  await waitFor(() => expect(screen.getByTestId('rest-circle')).toBeTruthy(), WAIT_OPTS);
  expect(setLog(1)).toMatchObject({ status: 'completed', repsActual: repsEntry.repTarget });
  expect(sessionsRepo.getSession(db, sessionId)!.pausedAt).toBeNull();
  await waitFor(() => expect(lastState().active?.feedback).not.toBeNull(), WAIT_OPTS);
  expect(lastState().active!.feedback!.question).toMatch(/^How was the target for /);

  await fromWatch({ type: 'rate', sessionId, difficulty: 'too_hard' });
  await waitFor(
    () =>
      expect(
        sessionsRepo.getSession(db, sessionId)!.entries.find((e) => e.id === repsEntry.id)!
          .difficultyFeedback,
      ).toBe('too_hard'),
    WAIT_OPTS,
  );
  await waitFor(() => expect(lastState().active?.feedback?.current).toBe('too_hard'), WAIT_OPTS);

  // Skip records nothing and leaves the answer already given alone.
  await fromWatch({ type: 'skipFeedback', sessionId });
  expect(lastState().active?.feedback).toMatchObject({ current: 'too_hard', neverAgainDone: false });

  // "Never again" disables the exercise just finished, the same switch as the Field Guide's.
  expect(exerciseStateRepo.getDisabledExerciseIds(db)).not.toContain(repsEntry.exerciseId);
  await fromWatch({ type: 'neverAgain', sessionId });
  expect(exerciseStateRepo.getDisabledExerciseIds(db)).toContain(repsEntry.exerciseId);
  await waitFor(() => expect(lastState().active?.feedback?.neverAgainDone).toBe(true), WAIT_OPTS);

  // Stopping from the wrist goes to Summary; FINISH stays on the phone.
  await fromWatch({ type: 'end', sessionId, healthSaved: true });
  await waitFor(
    () => expect(navigation.replace).toHaveBeenCalledWith('Summary', { sessionId }),
    WAIT_OPTS,
  );

  // Commands for another session are not this workout's.
  navigation.replace.mockClear();
  await fromWatch({ type: 'end', sessionId: 'someone-else' });
  expect(navigation.replace).not.toHaveBeenCalled();
}, 40000);
