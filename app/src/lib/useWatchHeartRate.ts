import { useEffect, useState } from 'react';
import * as WatchLink from '../../modules/watch-connectivity';

/** A reading older than this is dropped from the screen: the watch sends a new one every few
 *  seconds while it has one, so silence means it lost the sensor, left range or stopped. */
export const HEART_RATE_STALE_MS = 20_000;

/** Plausible bounds for a live reading; anything else is a sensor glitch and is not shown. */
const MIN_BPM = 30;
const MAX_BPM = 240;

/**
 * The wearer's heart rate as the Apple Watch last reported it, or null when there is none (no
 * watch, out of range, no reading yet, or the last one went stale). Live only: it is held in this
 * hook's state and never stored, logged or read from Health.
 */
export function useWatchHeartRate(): number | null {
  const [bpm, setBpm] = useState<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = WatchLink.onHeartRate((reading) => {
      if (!(reading.bpm >= MIN_BPM && reading.bpm <= MAX_BPM)) return;
      setBpm(Math.round(reading.bpm));
      if (timer) clearTimeout(timer);
      // Staleness runs on this phone's clock from when the reading arrived, not the watch's stamp.
      timer = setTimeout(() => setBpm(null), HEART_RATE_STALE_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return bpm;
}
