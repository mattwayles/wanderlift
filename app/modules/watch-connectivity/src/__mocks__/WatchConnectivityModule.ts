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
}

let state: FakeState = fresh();

function fresh(): FakeState {
  return { installed: true, reachable: true, sent: [], queue: [], flags: [], listeners: new Set() };
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

  addListener(_event: 'onWake', listener: Listener): { remove(): void } {
    state.listeners.add(listener);
    return { remove: () => state.listeners.delete(listener) };
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
  /** Every state sent to the watch, oldest first. */
  __sent(): string[] {
    return state.sent;
  },
};
