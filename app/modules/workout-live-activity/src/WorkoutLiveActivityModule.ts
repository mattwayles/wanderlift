import { requireOptionalNativeModule } from 'expo-modules-core';

import type { WorkoutActivityState } from '../index';

/** The raw native surface (ios/WorkoutLiveActivityModule.swift). App code uses the typed `index.ts`. */
export interface WorkoutLiveActivityNative {
  areEnabled(): boolean;
  activeSessionIds(): string[];
  start(sessionId: string, title: string, state: WorkoutActivityState): Promise<boolean>;
  update(sessionId: string, state: WorkoutActivityState): Promise<boolean>;
  end(sessionId: string | null): Promise<void>;
}

// Under Jest this whole file is replaced by ./__mocks__/WorkoutLiveActivityModule.ts (see
// jest.setup.js), so the native lookup below only ever runs in a real dev-client / release build.
// Optional, unlike the iCloud module: a dev client built before this module existed has no such
// native module, and the workout must still run on it (index.ts turns null into no-ops).
export default requireOptionalNativeModule<WorkoutLiveActivityNative>('WorkoutLiveActivity');
