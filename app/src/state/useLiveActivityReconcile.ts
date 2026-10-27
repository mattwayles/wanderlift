import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sessionsRepo } from '@roamfit/store';
import { reconcileWorkoutActivities } from '../lib/workoutLiveActivity';
import { useStore } from './StoreContext';

/**
 * Takes a finished workout's Live Activity down if nothing else did — the app was killed mid-workout
 * and the session abandoned from somewhere else, say. Runs at launch and each time the app comes
 * back to the foreground. Mount it once, under `StoreProvider`.
 */
export function useLiveActivityReconcile(): void {
  const { db } = useStore();
  useEffect(() => {
    const reconcile = () =>
      reconcileWorkoutActivities((id) => sessionsRepo.getSession(db, id)?.status === 'active');
    reconcile();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => subscription.remove();
  }, [db]);
}
