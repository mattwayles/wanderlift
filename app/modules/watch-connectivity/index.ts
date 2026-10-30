import WatchConnectivityNative from './src/WatchConnectivityModule';
import type { WatchLinkStatus } from './src/WatchConnectivityModule';

export type { WatchLinkStatus };

/**
 * A pipe to the Apple Watch app: JSON strings out (the workout state) and in (the watch's
 * commands), over Bluetooth. Generic on purpose: the shapes live in `src/lib/watchProtocol.ts`.
 * Without the native module (a dev client built before it existed) every call is a quiet no-op.
 */

const UNAVAILABLE: WatchLinkStatus = {
  supported: false,
  paired: false,
  installed: false,
  reachable: false,
};

export function status(): WatchLinkStatus {
  return WatchConnectivityNative?.status() ?? UNAVAILABLE;
}

/** Hands the newest state to the watch (delivered when it next runs, instantly if in range). */
export function sendState(json: string): void {
  WatchConnectivityNative?.sendState(json);
}

/** Commands received since the last call, oldest first. Each is returned once. */
export function drainCommands(): string[] {
  return WatchConnectivityNative?.drainCommands() ?? [];
}

/** Calls `listener` when a command has been queued. Returns the unsubscribe. */
export function onWake(listener: () => void): () => void {
  const sub = WatchConnectivityNative?.addListener('onWake', listener);
  return () => sub?.remove();
}

/** Calls `listener` with each live heart rate reading the watch sends (never queued or stored: a
 *  reading with no one listening is dropped). Returns the unsubscribe. */
export function onHeartRate(
  listener: (reading: { bpm: number; atMs: number }) => void,
): () => void {
  const sub = WatchConnectivityNative?.addListener('onHeartRate', listener);
  return () => sub?.remove();
}

/** Remembers a string across launches; the newest 50 are kept. */
export function setFlag(key: string): void {
  WatchConnectivityNative?.setFlag(key);
}

export function hasFlag(key: string): boolean {
  return WatchConnectivityNative?.flags().includes(key) ?? false;
}
