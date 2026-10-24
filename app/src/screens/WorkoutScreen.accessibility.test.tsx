/**
 * VoiceOver contract for the workout loop, driven through the real WorkoutScreen: the clock, the
 * set view and the rest page speak their state, and the screen announces where the user is when a
 * set or the rest page appears (iOS gives focus to nothing when the old view unmounts).
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createRng, seedFromString } from '@roamfit/engine';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { generate, sessionsRepo, usersRepo } from '@roamfit/store';
import WorkoutScreen from './WorkoutScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

function Setup({ onReady }: { onReady: (db: ReturnType<typeof useStore>['db']) => void }) {
  const { db } = useStore();
  const pending = sessionsRepo.getPendingSession(db);
  if (pending) sessionsRepo.discardSession(db, pending.id, {}, new Date().toISOString());
  onReady(db);
  return null;
}

describe('Workout loop: VoiceOver', () => {
  it('names the clock, announces the set, then the rest page, and gives the rest ring seconds', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    let db!: ReturnType<typeof useStore>['db'];
    render(
      <StoreProvider>
        <Setup onReady={(d) => (db = d)} />
      </StoreProvider>,
    );
    await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);

    const clock = nowEngineClock();
    const utcInstant = nowUtcInstant();
    const { plan, comebackTier, recoveryWeekManual } = generate(db, {
      library: exerciseLibrary,
      families: familyLibrary,
      request: { focus: 'full', difficulty: 'medium', targetMinutes: 30 },
      clock,
      rng: createRng(seedFromString('a11y-workout-seed')),
      utcInstant,
    });
    const sessionId = sessionsRepo.createPendingSession(db, {
      plan,
      utcInstant,
      localDate: clock.today,
      tzId: clock.tzId,
      comebackTier,
      recoveryWeekManual,
    });
    sessionsRepo.startSession(db, sessionId, nowUtcInstant());
    usersRepo.updateUser(db, { feedbackPromptEnabled: false }, nowUtcInstant());

    const session = sessionsRepo.getSession(db, sessionId)!;
    const firstRepsEntry = session.entries.find(
      (e) =>
        e.section === 'main' && e.durationSec == null && e.entryStatus !== 'removed_at_approval',
    )!;
    for (const entry of session.entries) {
      if (entry.id === firstRepsEntry.id) break;
      if (entry.entryStatus === 'removed_at_approval') continue;
      for (let i = 0; i < entry.sets; i++) {
        sessionsRepo.logSet(
          db,
          {
            entryId: entry.id,
            setIndex: i,
            status: 'completed',
            repsPrescribed: entry.repTarget ?? undefined,
            secondsPrescribed: entry.durationSec ?? undefined,
            repsActual: entry.repTarget ?? undefined,
            secondsActual: entry.durationSec ?? undefined,
            restPrescribedSec: entry.restSec,
          },
          nowUtcInstant(),
        );
      }
    }

    render(
      <StoreProvider>
        <WorkoutScreen
          navigation={
            {
              navigate: jest.fn(),
              replace: jest.fn(),
              reset: jest.fn(),
              goBack: jest.fn(),
              setOptions: jest.fn(),
            } as never
          }
          route={{ key: 'Workout', name: 'Workout', params: { sessionId } } as never}
        />
      </StoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('complete-set')).toBeTruthy(), WAIT_OPTS);
    expect(screen.getByTestId('workout-elapsed').props.accessibilityLabel).toMatch(
      /^Elapsed \d+ minutes \d+ seconds$/,
    );
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/Set 1 of \d+/));

    fireEvent.press(screen.getByTestId('complete-set'));
    await waitFor(() => expect(screen.getByTestId('rest-circle')).toBeTruthy(), WAIT_OPTS);
    const ring = screen.getByTestId('rest-circle');
    expect(ring.props.accessibilityLabel).toBe('Rest time remaining');
    expect(ring.props.accessibilityValue).toEqual({ text: expect.stringMatching(/^\d+ seconds$/) });
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Rest\. \d+ seconds\. Up next: /));
  });
});
