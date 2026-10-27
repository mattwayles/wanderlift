// React 19's act() environment detection needs this flag set explicitly under jest-expo +
// @testing-library/react-native — without it every state update inside a test logs a benign but
// noisy "not configured to support act(...)" console.error even though the test itself passes.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* global jest */
// Native iCloud backup module (Track 43): app tests get the in-memory fake next to the module
// (modules/icloud-backup/src/__mocks__), never the native lookup. Reset it with `__reset()`.
jest.mock('./modules/icloud-backup/src/ICloudBackupModule');
// Native Live Activity module: same arrangement (modules/workout-live-activity/src/__mocks__).
jest.mock('./modules/workout-live-activity/src/WorkoutLiveActivityModule');
