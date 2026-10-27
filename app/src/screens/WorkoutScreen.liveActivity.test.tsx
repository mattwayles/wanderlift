/**
 * The Live Activity mirror, driven through the real WorkoutScreen: the set on deck is shown when
 * the screen opens, a completed set switches it to the rest countdown (and ±15s moves the rest's
 * end), a pause freezes the elapsed number, and abandoning takes it down. Asserts on the in-memory
 * native fake (`jest.setup.js`), so it proves what would be sent — the widget drawing it needs a
 * device (STATUS-live-activity.md).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createRng, seedFromString } from '@roamfit/engine';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { generate, schema, sessionsRepo, usersRepo } from '@roamfit/store';
import { eq } from 'drizzle-orm';
import WorkoutScreen from './WorkoutScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import { fastForwardTo } from './timedTestHelpers';
import { __flushLiveActivityQueue, __resetLiveActivity } from '../lib/workoutLiveActivity';
import LiveActivityMock from '../../modules/workout-live-activity/src/WorkoutLiveActivityModule';
import type { WorkoutActivityState } from '../../modules/workout-live-activity';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

const mock = LiveActivityMock as unknown as {
  __reset(): void;
  __current(): { sessionId: string; title: string; state: WorkoutActivityState } | null;
};

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

/** What the fake is showing once every queued native call has landed. */
async function shown() {
  await __flushLiveActivityQueue();
  return mock.__current();
}

beforeEach(() => {
  mock.__reset();
  __resetLiveActivity();
});

it('mirrors the set on deck, the rest, the pause, and goes away on abandon', async () => {
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
    rng: createRng(seedFromString('live-activity-test-seed')),
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
  // Two sets, so the rest after the first is followed by the same exercise again.
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

  // Opening the workout puts the set on deck up, with the clock running.
  let activity = await shown();
  expect(activity?.sessionId).toBe(sessionId);
  expect(activity?.title).toBe('Full body · Medium');
  expect(activity?.state).toMatchObject({
    exerciseName: name,
    setLabel: 'Set 1 of 2',
    resting: false,
    pausedElapsedSec: null,
  });

  // A completed set switches it to the rest countdown, now naming the set up next.
  const before = Date.now();
  await fireEvent.press(screen.getByTestId('complete-set'));
  await waitFor(() => expect(screen.getByTestId('rest-circle')).toBeTruthy(), WAIT_OPTS);
  activity = await shown();
  expect(activity?.state).toMatchObject({
    exerciseName: name,
    setLabel: 'Set 2 of 2',
    resting: true,
  });
  const endsAt = activity!.state.restEndsAtMs!;
  expect(endsAt).toBeGreaterThanOrEqual(before + 59_000);
  expect(endsAt).toBeLessThanOrEqual(Date.now() + 60_000);

  // +15s moves the end out.
  await fireEvent.press(screen.getByTestId('rest-plus-15'));
  await waitFor(async () => {
    expect((await shown())!.state.restEndsAtMs!).toBeGreaterThan(endsAt + 10_000);
  }, WAIT_OPTS);

  // Pausing freezes the elapsed number (the rest keeps counting, as it does on screen).
  await fireEvent.press(screen.getByLabelText('Pause workout'));
  await waitFor(async () => {
    expect((await shown())!.state.pausedElapsedSec).not.toBeNull();
  }, WAIT_OPTS);
  expect(mock.__current()!.state.resting).toBe(true);

  // Abandoning takes it down.
  await fireEvent.press(screen.getByTestId('abandon-button'));
  await waitFor(() => expect(screen.getByTestId('abandon-confirm-yes')).toBeTruthy(), WAIT_OPTS);
  await fireEvent.press(screen.getByTestId('abandon-confirm-yes'));
  await waitFor(() => expect(navigation.reset).toHaveBeenCalled(), WAIT_OPTS);
  expect(await shown()).toBeNull();
}, 20000);
