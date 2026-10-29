import { requireOptionalNativeModule } from 'expo-modules-core';

export interface WatchLinkStatus {
  supported: boolean;
  paired: boolean;
  /** The watch app is installed on the paired watch. */
  installed: boolean;
  /** The watch is in range right now. */
  reachable: boolean;
}

/** The raw native surface (ios/WatchConnectivityModule.swift). App code uses the typed `index.ts`. */
export interface WatchConnectivityNative {
  status(): WatchLinkStatus;
  sendState(json: string): void;
  drainCommands(): string[];
  setFlag(key: string): void;
  flags(): string[];
  addListener(event: 'onWake', listener: () => void): { remove(): void };
}

// Under Jest this file is replaced by ./__mocks__/WatchConnectivityModule.ts (jest.setup.js). Optional,
// like the Live Activity module: a dev client built before it existed runs the workout with every
// call a no-op.
export default requireOptionalNativeModule<WatchConnectivityNative>('WatchConnectivity');
