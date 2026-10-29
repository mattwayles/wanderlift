/**
 * The phone's side of the Apple Watch link: what is sent (and not re-sent), and how the watch's
 * commands reach their handlers. Against the in-memory fake `jest.setup.js` installs for the
 * native module; the watch drawing it needs a device (STATUS-watch-app.md).
 */
import WatchMock from '../../modules/watch-connectivity/src/WatchConnectivityModule';
import {
  __resetWorkoutWatch,
  clearWatchActive,
  composeWatchState,
  dispatchWatchCommands,
  publishActive,
  publishReady,
  registerWatchHandler,
  rememberWatchSavedHealth,
  setWatchRest,
  watchSavedHealth,
  watchSetFor,
  type WatchActiveInput,
} from './workoutWatch';
import { WATCH_PROTOCOL_VERSION, decodeCommand, type WatchState } from './watchProtocol';

const mock = WatchMock as unknown as {
  __reset(): void;
  __receive(json: string): void;
  __receiveSilently(json: string): void;
  __sent(): string[];
};

const sent = (): WatchState[] => mock.__sent().map((j) => JSON.parse(j) as WatchState);

const SET = watchSetFor(
  { id: 'e1', sets: 3, repTarget: 12, durationSec: null, unilateral: false },
  0,
  'Banded Row',
  'B3',
);

const ACTIVE: WatchActiveInput = {
  sessionId: 's1',
  title: 'Upper · Medium',
  paused: false,
  elapsedAnchorMs: 1000,
  pausedElapsedSec: null,
  progress: 0.25,
  set: SET,
  feedback: null,
  closing: false,
};

const READY = {
  sessionId: 's2',
  title: 'Legs · Easy',
  exerciseCount: 6,
  minutes: 30,
  resuming: false,
};

const command = (body: Record<string, unknown>) =>
  JSON.stringify({ v: WATCH_PROTOCOL_VERSION, id: `c${Math.random()}`, atMs: 1, ...body });

beforeEach(() => {
  mock.__reset();
  __resetWorkoutWatch();
});

describe('watchSetFor', () => {
  it('names the set by entry and index, and reads reps and holds', () => {
    expect(SET).toMatchObject({ setKey: 'e1:0', kind: 'reps', target: 12, band: 'B3', sets: 3 });
    const hold = watchSetFor(
      { id: 'e2', sets: 2, repTarget: null, durationSec: 30, unilateral: true },
      1,
      'Plank',
      null,
    );
    expect(hold).toMatchObject({ setKey: 'e2:1', kind: 'hold', target: 30, unilateral: true });
  });
});

describe('composeWatchState', () => {
  it('a running workout wins over a plan waiting, which wins over nothing', () => {
    expect(composeWatchState(ACTIVE, null, READY).mode).toBe('active');
    expect(composeWatchState(null, null, READY)).toMatchObject({ mode: 'ready', ready: READY });
    expect(composeWatchState(null, null, null)).toMatchObject({ mode: 'idle', ready: null });
  });

  it('merges the rest window into the active workout', () => {
    const rest = { startedAtMs: 5, endsAtMs: 65 };
    expect(composeWatchState(ACTIVE, rest, null).active?.rest).toEqual(rest);
  });
});

describe('sending state', () => {
  it('sends on change only, and revisions only go up', () => {
    publishActive(ACTIVE);
    publishActive({ ...ACTIVE });
    expect(sent()).toHaveLength(1);
    setWatchRest({ startedAtMs: 5, endsAtMs: 65 });
    publishActive({ ...ACTIVE, progress: 0.5 });
    const states = sent();
    expect(states).toHaveLength(3);
    expect(states.map((s) => s.rev)).toEqual([...states.map((s) => s.rev)].sort((a, b) => a - b));
    expect(new Set(states.map((s) => s.rev)).size).toBe(3);
    expect(states[1].active?.rest).toEqual({ startedAtMs: 5, endsAtMs: 65 });
  });

  it('goes back to the waiting plan when the workout screen goes away', () => {
    publishReady(READY);
    publishActive(ACTIVE);
    clearWatchActive('s1', false);
    expect(sent().at(-1)).toMatchObject({ mode: 'ready', ready: READY, active: null });
  });

  it('an ended session is not brought back by a late render', () => {
    publishActive(ACTIVE);
    clearWatchActive('s1', true);
    publishActive(ACTIVE);
    expect(sent().at(-1)?.mode).toBe('idle');
  });

  it('is a quiet no-op without a watch app', () => {
    (WatchMock as unknown as { __reset(): void }).__reset();
    expect(() => publishActive(ACTIVE)).not.toThrow();
  });
});

describe('commands from the watch', () => {
  it('reach every handler once, oldest first, and are drained', () => {
    const seen: string[] = [];
    registerWatchHandler((c) => seen.push(`a:${c.type}`));
    registerWatchHandler((c) => seen.push(`b:${c.type}`));
    mock.__receiveSilently(command({ type: 'pause', sessionId: 's1' }));
    mock.__receiveSilently(command({ type: 'resume', sessionId: 's1' }));
    expect(dispatchWatchCommands()).toBe(2);
    expect(seen).toEqual(['a:pause', 'b:pause', 'a:resume', 'b:resume']);
    expect(dispatchWatchCommands()).toBe(0);
  });

  it('drops malformed commands and ones from another protocol version', () => {
    const seen: string[] = [];
    registerWatchHandler((c) => seen.push(c.type));
    mock.__receiveSilently('not json');
    mock.__receiveSilently(JSON.stringify({ v: 99, id: 'x', type: 'pause' }));
    mock.__receiveSilently(JSON.stringify({ v: WATCH_PROTOCOL_VERSION, type: 'pause' }));
    expect(dispatchWatchCommands()).toBe(0);
    expect(seen).toEqual([]);
    expect(decodeCommand(command({ type: 'pause', sessionId: 's' }))?.type).toBe('pause');
  });

  it('one handler throwing does not stop the others', () => {
    const seen: string[] = [];
    registerWatchHandler(() => {
      throw new Error('boom');
    });
    registerWatchHandler((c) => seen.push(c.type));
    mock.__receiveSilently(command({ type: 'pause', sessionId: 's1' }));
    dispatchWatchCommands();
    expect(seen).toEqual(['pause']);
  });

  it('a handler stops hearing commands once unregistered', () => {
    const seen: string[] = [];
    const off = registerWatchHandler((c) => seen.push(c.type));
    off();
    mock.__receiveSilently(command({ type: 'pause', sessionId: 's1' }));
    dispatchWatchCommands();
    expect(seen).toEqual([]);
  });
});

describe('the watch saving the workout to Health', () => {
  it('is remembered per session', () => {
    expect(watchSavedHealth('s1')).toBe(false);
    rememberWatchSavedHealth('s1');
    expect(watchSavedHealth('s1')).toBe(true);
    expect(watchSavedHealth('s2')).toBe(false);
  });
});
