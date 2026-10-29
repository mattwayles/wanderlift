import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { sessionsRepo } from '@roamfit/store';
import * as WatchLink from '../../modules/watch-connectivity';
import type { RootStackParamList } from '../navigation/types';
import { activeEntries } from '../lib/sessionProgress';
import { nowUtcInstant } from '../lib/localClock';
import { workoutActivityTitle } from '../lib/workoutLiveActivity';
import {
  dispatchWatchCommands,
  publishReady,
  registerWatchHandler,
  rememberWatchSavedHealth,
} from '../lib/workoutWatch';
import type { WatchCommand } from '../lib/watchProtocol';
import { useStore } from './StoreContext';

/**
 * The app-level half of the Apple Watch link; mount it once, under the store and the navigation
 * container. It covers what no Workout screen is there for:
 *
 * - tells the watch whether a plan is waiting to start, or a workout was left behind (the "ready"
 *   state the watch offers Start on);
 * - starts the pending session when the watch asks (the same `startSession` + Workout screen the
 *   Approval screen's Start does), so no generation or approval is skipped: the plan on the phone
 *   is the one that starts;
 * - remembers that the watch saved the workout to Health, so FINISH does not write it twice;
 * - drains the watch's commands at launch, on foreground and whenever one arrives.
 *
 * Best-effort throughout: with no watch or no native module this does nothing.
 */
export function useWatchHost(navRef: NavigationContainerRefWithCurrent<RootStackParamList>): void {
  const { db } = useStore();

  useEffect(() => {
    const refresh = () => {
      const pending = sessionsRepo.getPendingSession(db);
      publishReady(
        pending && (pending.status === 'planned' || pending.status === 'active')
          ? {
              sessionId: pending.id,
              title: workoutActivityTitle(pending.focus, pending.difficulty),
              exerciseCount: activeEntries(pending).length,
              minutes: Math.round(pending.estimatedMinutes),
              resuming: pending.status === 'active',
            }
          : null,
      );
    };

    const handle = (command: WatchCommand) => {
      if (command.type === 'end' && command.healthSaved) {
        rememberWatchSavedHealth(command.sessionId);
      }
      if (command.type !== 'start') return;
      const session = sessionsRepo.getSession(db, command.sessionId);
      if (!session || (session.status !== 'planned' && session.status !== 'active')) return;
      if (session.status === 'planned') {
        sessionsRepo.startSession(db, command.sessionId, nowUtcInstant());
      }
      if (navRef.isReady()) navRef.navigate('Workout', { sessionId: command.sessionId });
      refresh();
    };

    const unregister = registerWatchHandler(handle);
    const drain = () => {
      dispatchWatchCommands();
      refresh();
    };
    drain();
    const unwake = WatchLink.onWake(drain);
    const unnav = navRef.addListener('state', refresh);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') drain();
    });
    return () => {
      unregister();
      unwake();
      unnav();
      appState.remove();
    };
  }, [db, navRef]);
}
