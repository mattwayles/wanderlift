import { act, renderHook } from '@testing-library/react-native';
import WatchMock from '../../modules/watch-connectivity/src/WatchConnectivityModule';
import { HEART_RATE_STALE_MS, useWatchHeartRate } from './useWatchHeartRate';

const mock = WatchMock as unknown as { __reset(): void; __heartRate(bpm: number): void };

beforeEach(() => {
  mock.__reset();
});

describe('useWatchHeartRate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is null until the watch reports, then follows each reading', async () => {
    const { result } = await renderHook(() => useWatchHeartRate());
    expect(result.current).toBeNull();
    await act(async () => mock.__heartRate(118.4));
    expect(result.current).toBe(118);
    await act(async () => mock.__heartRate(131));
    expect(result.current).toBe(131);
  });

  it('drops a reading that goes stale, and a fresh one keeps it alive', async () => {
    const { result } = await renderHook(() => useWatchHeartRate());
    await act(async () => mock.__heartRate(120));
    await act(async () => {
      jest.advanceTimersByTime(HEART_RATE_STALE_MS - 1000);
    });
    expect(result.current).toBe(120);
    await act(async () => mock.__heartRate(122)); // a new reading restarts the clock
    await act(async () => {
      jest.advanceTimersByTime(HEART_RATE_STALE_MS - 1000);
    });
    expect(result.current).toBe(122);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBeNull();
  });

  it('ignores a reading no heart could produce', async () => {
    const { result } = await renderHook(() => useWatchHeartRate());
    await act(async () => mock.__heartRate(0));
    expect(result.current).toBeNull();
    await act(async () => mock.__heartRate(500));
    expect(result.current).toBeNull();
  });

  it('stops listening when unmounted', async () => {
    const { result, unmount } = await renderHook(() => useWatchHeartRate());
    unmount();
    await act(async () => mock.__heartRate(120));
    expect(result.current).toBeNull();
  });
});
