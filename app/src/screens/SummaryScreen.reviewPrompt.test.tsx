/**
 * Track 50b — the App Store rating request, through the real SummaryScreen and store. It fires
 * only when "Heck yes!" is pressed on the completion screen of an eligible session (3rd workout
 * or a level-up, not already asked this app version); `expo-store-review` is mocked, and the
 * eligibility rule itself is covered in reviewPrompt.test.ts.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as StoreReview from 'expo-store-review';
import { createRng, seedFromString } from '@roamfit/engine';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { completeSession, generate, sessionsRepo, usersRepo } from '@roamfit/store';
import SummaryScreen from './SummaryScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import { appVersion } from '../lib/appInfo';
import { getLiveClient } from '../db';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));
const isAvailable = StoreReview.isAvailableAsync as jest.Mock;
const requestReview = StoreReview.requestReview as jest.Mock;

jest.setTimeout(30000);
const EVENTUALLY = { timeout: 12000, interval: 50 };

type Db = ReturnType<typeof useStore>['db'];

function Setup({ onReady }: { onReady: (db: Db) => void }) {
  const { db } = useStore();
  const pending = sessionsRepo.getPendingSession(db);
  if (pending) sessionsRepo.discardSession(db, pending.id, {}, new Date().toISOString());
  onReady(db);
  return null;
}

/** A started session with every set logged complete, ready to FINISH. */
function startedSession(db: Db, seed: string): string {
  const clock = nowEngineClock();
  const utcInstant = nowUtcInstant();
  const { plan, comebackTier, recoveryWeekManual } = generate(db, {
    library: exerciseLibrary,
    families: familyLibrary,
    request: { focus: 'legs', difficulty: 'medium', targetMinutes: 30 },
    clock,
    rng: createRng(seedFromString(seed)),
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
  sessionsRepo.startSession(db, sessionId, utcInstant);
  for (const e of sessionsRepo.getSession(db, sessionId)!.entries) {
    if (e.entryStatus === 'removed_at_approval') continue;
    for (let i = 0; i < e.sets; i += 1) {
      sessionsRepo.logSet(
        db,
        {
          entryId: e.id,
          setIndex: i,
          status: 'completed',
          repsActual: e.repTarget ?? undefined,
          secondsActual: e.durationSec ?? undefined,
          restPrescribedSec: e.restSec,
        },
        utcInstant,
      );
    }
  }
  return sessionId;
}

/** Complete `earlier` workouts in the store, then render the Summary for one more and FINISH it. */
async function finishASession(earlier: number, asked?: { date: string; version: string }) {
  let db!: Db;
  render(
    <StoreProvider>
      <Setup onReady={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), EVENTUALLY);
  usersRepo.ensureUser(db, nowUtcInstant());
  if (asked) {
    usersRepo.updateUser(
      db,
      { reviewPromptLastAskedDate: asked.date, reviewPromptLastAskedVersion: asked.version },
      nowUtcInstant(),
    );
  }
  for (let n = 0; n < earlier; n += 1) {
    const id = startedSession(db, `review-prompt-earlier-${n}`);
    completeSession(
      db,
      { sessionId: id, library: exerciseLibrary, families: familyLibrary },
      nowUtcInstant(),
    );
  }
  const sessionId = startedSession(db, 'review-prompt-seed');
  render(
    <StoreProvider>
      <NavigationContainer>
        <SummaryScreen
          navigation={
            {
              navigate: jest.fn(),
              replace: jest.fn(),
              reset: jest.fn(),
              goBack: jest.fn(),
              setOptions: jest.fn(),
            } as never
          }
          route={{ key: 'Summary', name: 'Summary', params: { sessionId } } as never}
        />
      </NavigationContainer>
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('finish-button')).toBeTruthy(), EVENTUALLY);
  fireEvent.press(screen.getByTestId('finish-button'));
  await waitFor(() => expect(screen.getByTestId('session-complete')).toBeTruthy(), EVENTUALLY);
  await waitFor(() => expect(screen.getByTestId('return-home')).toBeTruthy(), EVENTUALLY);
  return db;
}

describe('App Store rating request on leaving the completion screen', () => {
  beforeEach(() => {
    isAvailable.mockReset().mockResolvedValue(true);
    requestReview.mockReset().mockResolvedValue(undefined);
    // The db file lives for the whole test file: forget earlier tests' workouts and asks.
    getLiveClient().executeSync(
      "UPDATE sessions SET status = 'discarded' WHERE status = 'completed'",
    );
    getLiveClient().executeSync(
      'UPDATE users SET review_prompt_last_asked_date = NULL, review_prompt_last_asked_version = NULL',
    );
  });

  it('asks when "Heck yes!" is pressed on the 3rd completed workout, and records the ask', async () => {
    const db = await finishASession(2);
    expect(requestReview).not.toHaveBeenCalled(); // never mid-celebration
    fireEvent.press(screen.getByTestId('return-home'));
    await waitFor(() => expect(requestReview).toHaveBeenCalledTimes(1), EVENTUALLY);
    expect(usersRepo.getUser(db)).toMatchObject({
      reviewPromptLastAskedDate: nowEngineClock().today,
      reviewPromptLastAskedVersion: appVersion(),
    });
  });

  it('does not ask on an early workout with no level-up', async () => {
    await finishASession(0);
    fireEvent.press(screen.getByTestId('return-home'));
    await new Promise((r) => setTimeout(r, 200));
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('does not ask again in a version it already asked in', async () => {
    await finishASession(2, { date: '2020-01-01', version: appVersion() });
    fireEvent.press(screen.getByTestId('return-home'));
    await new Promise((r) => setTimeout(r, 200));
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('does not ask when the store sheet is unavailable', async () => {
    isAvailable.mockResolvedValue(false);
    await finishASession(2);
    fireEvent.press(screen.getByTestId('return-home'));
    await waitFor(() => expect(isAvailable).toHaveBeenCalled(), EVENTUALLY);
    expect(requestReview).not.toHaveBeenCalled();
  });
});
