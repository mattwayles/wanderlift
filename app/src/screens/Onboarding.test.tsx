/**
 * Track 37h / 51c — first-launch setup, through the real navigator and the real on-device store.
 * This file gets its own fresh db (see `app/src/db/index.ts`), so its first test really is a first
 * launch. Tests run in order and share that db: the disclaimer trap, then the full walkthrough
 * (with relaunches), then review from Settings.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { exerciseLibrary, familyLibrary } from '@roamfit/data';
import { isMaxLevel } from '@roamfit/engine';
import { createRng } from '@roamfit/engine';
import { levelUpFamily, progressionStateRepo, sessionsRepo, usersRepo } from '@roamfit/store';
import RootNavigator from '../navigation/RootNavigator';
import { StoreProvider } from '../state/StoreContext';
import { ThemeProvider } from '../state/ThemeProvider';
import { getDb } from '../db';
import { DISCLAIMER_TEXT } from '../lib/disclaimer';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import * as motivation from '../lib/motivationNotifications';
import { WAIT, ready } from '../ui/test-utils';

jest.mock('../lib/motivationNotifications', () => ({
  ...jest.requireActual('../lib/motivationNotifications'),
  ensureNotificationPermission: jest.fn().mockResolvedValue(undefined),
  scheduleMotivationNotifications: jest.fn().mockResolvedValue(undefined),
}));

async function launch() {
  await render(
    <StoreProvider>
      <ThemeProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </StoreProvider>,
  );
}

const checked = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState.checked as boolean;
const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const step = (id: string) => ready(`onboarding-step-${id}`);
const user = () => usersRepo.getUser(getDb())!;
const states = () => progressionStateRepo.getAllProgressionStates(getDb());

describe('first-launch setup', () => {
  it('opens on the value screens (with the logo), and leaving them starts setup without acknowledging the disclaimer', async () => {
    await launch();
    await ready('welcome-gate');
    expect(screen.getByTestId('welcome-logo')).toBeTruthy();
    await ready('value-screens');
    expect(screen.queryByTestId('tab-Journey')).toBeNull();
    expect(screen.queryByTestId('disclaimer-acknowledge')).toBeNull();
    await press('value-skip');
    await step('start');
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('1 of 5');
    expect(user().onboardingInProgress).toBe(true);
    expect(user().hasAcknowledgedDisclaimer).toBe(false);
  });

  it('disclaimer trap: Skip setup from "Where are you starting?" lands ON the disclaimer, and a relaunch still shows setup, not Today', async () => {
    await launch();
    await step('start');
    await press('start-active');
    await press('onboarding-skip');
    await ready('disclaimer-gate');
    expect(screen.getByTestId('disclaimer-gate-text')).toHaveTextContent(DISCLAIMER_TEXT, { normalizeWhitespace: true });
    expect(screen.queryByTestId('tab-Journey')).toBeNull();
    expect(user().hasAcknowledgedDisclaimer).toBe(false);
    expect(user().onboardingInProgress).toBe(true);
    // Nothing the store offers can finish setup ahead of the acknowledgement.
    expect(usersRepo.finishOnboarding(getDb(), nowUtcInstant())).toBe(false);
    expect(user().onboardingInProgress).toBe(true);

    await screen.unmount();
    await launch();
    await step('start');
    expect(screen.queryByTestId('value-screens')).toBeNull();
    expect(screen.queryByTestId('today-card')).toBeNull();
    expect(user().hasAcknowledgedDisclaimer).toBe(false);
    // The earlier answer is pre-selected.
    expect(checked('start-active')).toBe(true);
  });

  it('every step saves as it goes, the disclaimer gates the rest, and the plan reveal opens the first workout', async () => {
    await launch();
    await step('start');
    // Where are you starting? Changing the answer re-applies it.
    const l1 = 'horizontal_push.l1';
    expect(states().horizontal_push.levelId).not.toBe(l1);
    await press('start-restarting');
    expect(states().horizontal_push.levelId).toBe(l1);
    await press('start-regular');
    expect(user().startingPoint).toBe('regular');
    expect(states().horizontal_push.levelId).not.toBe(l1);
    await press('onboarding-next');

    await step('goal');
    expect(checked('pref-goal-general')).toBe(true);
    await press('pref-goal-muscle');
    await press('onboarding-next');

    // What do you have? Door turns bands on; Nothing clears everything; any pick clears Nothing.
    await step('equipment');
    expect(user().anchorsAvailable).toEqual([]);
    await press('equip-door');
    expect(user().anchorsAvailable).toEqual(
      expect.arrayContaining(['anchor-low', 'anchor-mid', 'anchor-high']),
    );
    expect(user().bandSettings.owned.length).toBeGreaterThan(0);
    expect(user().bandsSetUp).toBe(true);
    expect(checked('equip-bands')).toBe(true);
    expect(checked('equip-door')).toBe(true);
    await press('equip-bar');
    expect(user().anchorsAvailable).toContain('pullup-bar');
    await press('equip-nothing');
    expect(user().anchorsAvailable).toEqual([]);
    expect(user().bandSettings.owned).toEqual([]);
    expect(checked('equip-nothing')).toBe(true);
    await press('equip-bands');
    expect(checked('equip-nothing')).toBe(false);
    expect(user().bandSettings.owned.length).toBe(5);
    await press('equip-door');
    await press('equip-bar');
    await press('onboarding-back');
    await step('goal');
    expect(checked('pref-goal-muscle')).toBe(true);
    await press('onboarding-next');
    await step('equipment');
    expect(checked('equip-door')).toBe(true);
    expect(checked('equip-bar')).toBe(true);
    await press('onboarding-next');

    await step('limitations');
    await press('limitation-knee');
    await press('onboarding-next');

    // The disclaimer, in full, worded as care, and still unacknowledged.
    await ready('disclaimer-gate');
    expect(screen.getByTestId('onboarding-progress')).toHaveTextContent('5 of 5');
    expect(screen.getByText('One thing before you start')).toBeTruthy();
    expect(screen.getByTestId('disclaimer-gate-text')).toHaveTextContent(DISCLAIMER_TEXT, { normalizeWhitespace: true });
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
    expect(screen.queryByTestId('tab-Journey')).toBeNull();
    expect(user().hasAcknowledgedDisclaimer).toBe(false);
    await press('disclaimer-acknowledge');
    await ready('notification-primer');
    expect(user().hasAcknowledgedDisclaimer).toBe(true);
    expect(user().onboardingInProgress).toBe(true);

    // A relaunch after the disclaimer resumes at the primer, not the questions.
    await screen.unmount();
    await launch();
    await ready('notification-primer');
    expect(screen.queryByTestId('onboarding-step-start')).toBeNull();

    // Turning reminders on saves the prefs and asks for permission and schedules.
    await press('primer-enable');
    await ready('plan-reveal');
    expect(user().notificationPrefs).toMatchObject({
      motivationEnabled: true,
      motivationTimes: ['18:00'],
    });
    await waitFor(
      () => expect(motivation.scheduleMotivationNotifications).toHaveBeenCalledTimes(1),
      WAIT,
    );
    expect(motivation.ensureNotificationPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('plan-goal')).toHaveTextContent(/Build muscle/);
    expect(screen.getAllByTestId(/^plan-trail-/)).toHaveLength(familyLibrary.families.length);
    expect(user().onboardingInProgress).toBe(true);

    await press('plan-start');
    await ready('start-button'); // the Approval screen, with the first workout ready
    const u = user();
    expect(u.onboardingInProgress).toBe(false);
    expect(u.hasAcknowledgedDisclaimer).toBe(true);
    expect(u.trainingPreferences.goal).toBe('muscle');
    expect(u.limitationChoices.map((c) => c.id)).toEqual(['knee']);
    expect(u.startingPoint).toBe('regular');
    expect(sessionsRepo.getPendingSession(getDb())).toBeTruthy();
  });

  it('"I train regularly" leaves every ladder climbable: nothing starts at the top, and level-up works on each', async () => {
    const db = getDb();
    for (const family of familyLibrary.families) {
      const before = states()[family.id];
      expect(before).toBeTruthy();
      expect(isMaxLevel(family, before.levelId)).toBe(false);
      const outcome = levelUpFamily(
        db,
        {
          familyId: family.id,
          library: exerciseLibrary,
          families: familyLibrary,
          clock: nowEngineClock(),
          rng: createRng(1),
        },
        nowUtcInstant(),
      );
      expect(outcome.status).toBe('levelled_up');
    }
  });

  it('Settings has no way back into setup', async () => {
    await launch();
    await ready('open-settings');
    await press('open-settings');
    await ready('settings-screen');
    expect(screen.queryByTestId('settings-run-setup')).toBeNull();
    expect(screen.queryByTestId('settings-placement')).toBeNull();
  });
});
