/**
 * A timed set driven from the Apple Watch. The phone owns the hold timer (its 3-2-1 beeps are what
 * reaches the user's headphones); the watch is shown the clock and sends Start and the crown's
 * ±5s steps. Real wall-clock timers, as in the other timed-set suites.
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { sessionsRepo } from '@roamfit/store';
import WorkoutScreen from './WorkoutScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { setUpTimedEntry } from './timedTestHelpers';
import { __resetLiveActivity } from '../lib/workoutLiveActivity';
import { __resetWorkoutWatch, dispatchWatchCommands } from '../lib/workoutWatch';
import { WATCH_PROTOCOL_VERSION, type WatchState } from '../lib/watchProtocol';
import WatchMock from '../../modules/watch-connectivity/src/WatchConnectivityModule';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };
const LONG_WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 15000, interval: 50 };

const mock = WatchMock as unknown as {
  __reset(): void;
  __receiveSilently(json: string): void;
  __sent(): string[];
};
const lastState = (): WatchState => JSON.parse(mock.__sent().at(-1)!) as WatchState;

let seq = 0;
async function fromWatch(body: Record<string, unknown>) {
  mock.__receiveSilently(
    JSON.stringify({ v: WATCH_PROTOCOL_VERSION, id: `hold-${++seq}`, atMs: Date.now(), ...body }),
  );
  await act(async () => {
    dispatchWatchCommands();
  });
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

it('shows the hold to the watch, takes its crown steps and Start, and completes the set itself', async () => {
  let db!: ReturnType<typeof useStore>['db'];
  render(
    <StoreProvider>
      <Setup onReady={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);
  const { sessionId, entryId } = await setUpTimedEntry(db, 'watch-hold-seed', {
    durationSec: 10,
    unilateral: false,
  });
  const navigation = {
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };
  render(
    <StoreProvider>
      <WorkoutScreen
        navigation={navigation as never}
        route={{ key: 'Workout', name: 'Workout', params: { sessionId } } as never}
      />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('timed-circle')).toBeTruthy(), WAIT_OPTS);

  // Not started: the watch is told the length and that nothing is running.
  const setKey = `${entryId}:0`;
  expect(lastState().active?.set).toMatchObject({ setKey, kind: 'hold', target: 10 });
  expect(lastState().active?.hold).toEqual({
    setKey,
    phase: 'ready',
    side: 1,
    durationSec: 10,
    endsAtMs: null,
    remainingSec: null,
  });

  // The crown: +5s twice, then -5s; a step for another set is ignored.
  await fromWatch({ type: 'adjustHold', sessionId, setKey, deltaSec: 5 });
  await fromWatch({ type: 'adjustHold', sessionId, setKey, deltaSec: 5 });
  await fromWatch({ type: 'adjustHold', sessionId, setKey, deltaSec: -5 });
  await fromWatch({ type: 'adjustHold', sessionId, setKey: 'nope:0', deltaSec: 50 });
  await waitFor(() => expect(lastState().active?.hold?.durationSec).toBe(15), WAIT_OPTS);
  expect(screen.getByTestId('timed-remaining')).toHaveTextContent('15');

  // Down to the 5s floor, so the run below is short.
  await fromWatch({ type: 'adjustHold', sessionId, setKey, deltaSec: -50 });
  await waitFor(() => expect(lastState().active?.hold?.durationSec).toBe(5), WAIT_OPTS);

  // Start: the phone's 3s count-in, with an end instant the watch can count down to and tap along.
  const before = Date.now();
  await fromWatch({ type: 'startHold', sessionId, setKey });
  await waitFor(() => expect(lastState().active?.hold?.phase).toBe('getReady'), WAIT_OPTS);
  const getReady = lastState().active!.hold!;
  expect(getReady.endsAtMs! - before).toBeGreaterThan(2000);
  expect(getReady.endsAtMs! - before).toBeLessThan(3500);

  // A second Start does not restart the count-in; Start for a stale set changes nothing.
  await fromWatch({ type: 'startHold', sessionId, setKey });
  expect(lastState().active!.hold!.endsAtMs).toBe(getReady.endsAtMs);

  // Then the hold, then the set is complete on the phone with no further command.
  await waitFor(() => expect(lastState().active?.hold?.phase).toBe('side'), LONG_WAIT_OPTS);
  await waitFor(() => expect(screen.getByTestId('rest-circle')).toBeTruthy(), LONG_WAIT_OPTS);
  expect(lastState().active?.hold).toBeNull();
  const log = sessionsRepo.getSession(db, sessionId)!.entries.find((e) => e.id === entryId)!
    .setLogs[0];
  expect(log).toMatchObject({ status: 'completed', secondsActual: 5 });
}, 40000);
