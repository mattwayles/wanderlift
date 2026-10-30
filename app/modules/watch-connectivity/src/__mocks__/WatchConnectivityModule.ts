/**
 * Jest stand-in for the native watch link, installed for every test by `jest.setup.js` so app
 * tests never reach native code. Records what was sent to the watch; tests push commands in with
 * `__receive`, as the watch would.
 */
type Listener = () => void;

interface FakeState {
  installed: boolean;
  reachable: boolean;
  sent: string[];
  queue: string[];
  flags: string[];
  listeners: Set<Listener>;
  heartListeners: Set<(reading: { bpm: number; atMs: number }) => void>;
}

let state: FakeState = fresh();

function fresh(): FakeState {
  return {
    installed: true,
    reachable: true,
    sent: [],
    queue: [],
    flags: [],
    listeners: new Set(),
    heartListeners: new Set(),
  };
}

export default {
  status() {
    return {
      supported: true,
      paired: state.installed,
      installed: state.installed,
      reachable: state.installed && state.reachable,
    };
  },

  sendState(json: string): void {
    state.sent.push(json);
  },

  drainCommands(): string[] {
    const out = state.queue;
    state.queue = [];
    return out;
  },

  setFlag(key: string): void {
    if (!state.flags.includes(key)) state.flags.push(key);
  },

  flags(): string[] {
    return state.flags;
  },

  addListener(event: 'onWake' | 'onHeartRate', listener: (arg: never) => void): { remove(): void } {
    if (event === 'onHeartRate') {
      const l = listener as (reading: { bpm: number; atMs: number }) => void;
      state.heartListeners.add(l);
      return { remove: () => state.heartListeners.delete(l) };
    }
    const l = listener as Listener;
    state.listeners.add(l);
    return { remove: () => state.listeners.delete(l) };
  },

  // ---- test helpers (not part of the native contract) ----

  __reset(): void {
    state = fresh();
  },
  __setInstalled(installed: boolean): void {
    state.installed = installed;
  },
  /** A command from the watch: queued, then listeners woken, as the native side does. */
  __receive(json: string): void {
    state.queue.push(json);
    for (const l of [...state.listeners]) l();
  },
  /** Queued without waking anyone: a command that arrived while JS was not running. */
  __receiveSilently(json: string): void {
    state.queue.push(json);
  },
  /** A live heart rate reading from the watch. */
  __heartRate(bpm: number, atMs: number = Date.now()): void {
    for (const l of [...state.heartListeners]) l({ bpm, atMs });
  },
  /** Every state sent to the watch, oldest first. */
  __sent(): string[] {
    return state.sent;
  },
};
