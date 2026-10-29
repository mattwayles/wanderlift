/**
 * The app-level watch host: offers the plan waiting to start, starts it when the watch asks (the
 * same startSession + Workout route as the Approval screen's Start), and remembers a workout the
 * watch saved to Health. Against the native fake; nothing here draws on the watch.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { createRng, seedFromString } from '@roamfit/engine';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { generate, sessionsRepo } from '@roamfit/store';
import { StoreProvider, useStore } from './StoreContext';
import { useWatchHost } from './useWatchHost';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import { __resetWorkoutWatch, watchSavedHealth } from '../lib/workoutWatch';
import { WATCH_PROTOCOL_VERSION, type WatchState } from '../lib/watchProtocol';
import WatchMock from '../../modules/watch-connectivity/src/WatchConnectivityModule';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

const mock = WatchMock as unknown as {
  __reset(): void;
  __receive(json: string): void;
  __sent(): string[];
};
const lastState = (): WatchState => JSON.parse(mock.__sent().at(-1)!) as WatchState;

let seq = 0;
const command = (body: Record<string, unknown>) =>
  JSON.stringify({ v: WATCH_PROTOCOL_VERSION, id: `h-${++seq}`, atMs: Date.now(), ...body });

const navRef = {
  isReady: jest.fn(() => true),
  navigate: jest.fn(),
  addListener: jest.fn(() => () => undefined),
};

function Host({ onDb }: { onDb: (db: ReturnType<typeof useStore>['db']) => void }) {
  const { db } = useStore();
  onDb(db);
  useWatchHost(navRef as never);
  return null;
}

beforeEach(() => {
  mock.__reset();
  __resetWorkoutWatch();
  navRef.navigate.mockClear();
  navRef.isReady.mockReturnValue(true);
});

function planSession(db: ReturnType<typeof useStore>['db']): string {
  const pending = sessionsRepo.getPendingSession(db);
  if (pending) sessionsRepo.discardSession(db, pending.id, {}, nowUtcInstant());
  const clock = nowEngineClock();
  const utcInstant = nowUtcInstant();
  const { plan, comebackTier, recoveryWeekManual } = generate(db, {
    library: exerciseLibrary,
    families: familyLibrary,
    request: { focus: 'upper', difficulty: 'easy', targetMinutes: 20 },
    clock,
    rng: createRng(seedFromString('watch-host-seed')),
    utcInstant,
  });
  return sessionsRepo.createPendingSession(db, {
    plan,
    utcInstant,
    localDate: clock.today,
    tzId: clock.tzId,
    comebackTier,
    recoveryWeekManual,
  });
}

it('offers the planned session, starts it when asked, and opens the Workout screen', async () => {
  let db!: ReturnType<typeof useStore>['db'];
  render(
    <StoreProvider>
      <Host onDb={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);

  const sessionId = planSession(db);
  // The host re-reads on a command, a foreground and a navigation change; a wake is the easy one.
  await act(async () => {
    mock.__receive(command({ type: 'start', sessionId: 'nonexistent' }));
  });
  expect(lastState()).toMatchObject({
    mode: 'ready',
    ready: { sessionId, title: 'Upper · Easy', resuming: false },
  });
  expect(sessionsRepo.getSession(db, sessionId)!.status).toBe('planned');
  expect(navRef.navigate).not.toHaveBeenCalled();

  await act(async () => {
    mock.__receive(command({ type: 'start', sessionId }));
  });
  expect(sessionsRepo.getSession(db, sessionId)!.status).toBe('active');
  expect(navRef.navigate).toHaveBeenCalledWith('Workout', { sessionId });
  expect(lastState().ready?.resuming).toBe(true);

  // Asking again resumes the workout screen without starting it a second time.
  navRef.navigate.mockClear();
  await act(async () => {
    mock.__receive(command({ type: 'start', sessionId }));
  });
  expect(navRef.navigate).toHaveBeenCalledWith('Workout', { sessionId });
}, 20000);

it('remembers a workout the watch saved to Health, only when it says so', async () => {
  let db!: ReturnType<typeof useStore>['db'];
  render(
    <StoreProvider>
      <Host onDb={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);
  await act(async () => {
    mock.__receive(command({ type: 'end', sessionId: 'a', healthSaved: true }));
    mock.__receive(command({ type: 'end', sessionId: 'b', healthSaved: false }));
  });
  expect(watchSavedHealth('a')).toBe(true);
  expect(watchSavedHealth('b')).toBe(false);
});
