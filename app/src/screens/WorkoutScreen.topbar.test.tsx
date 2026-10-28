/**
 * The Active Workout top bar's music button, plus the screen rendering real Daybreak values. Runs
 * inside the real ThemeProvider (no mock), unlike the other WorkoutScreen suites.
 */
import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { sessionsRepo, usersRepo } from '@roamfit/store';
import WorkoutScreen from './WorkoutScreen';
import { StoreProvider, useStore } from '../state/StoreContext';
import { ThemeProvider } from '../state/ThemeProvider';
import { daybreak } from '../theme';
import { inDaybreak } from '../ui/test-utils';
import { setUpTimedEntry } from './timedTestHelpers';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

function mockNavigation() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };
}

function Setup({ onReady }: { onReady: (db: ReturnType<typeof useStore>['db']) => void }) {
  const { db } = useStore();
  const pending = sessionsRepo.getPendingSession(db);
  if (pending) sessionsRepo.discardSession(db, pending.id, {}, new Date().toISOString());
  onReady(db);
  return null;
}

async function setUpSession(): Promise<{
  db: ReturnType<typeof useStore>['db'];
  sessionId: string;
}> {
  let db!: ReturnType<typeof useStore>['db'];
  render(
    <StoreProvider>
      <Setup onReady={(d) => (db = d)} />
    </StoreProvider>,
  );
  await waitFor(() => expect(db).toBeDefined(), WAIT_OPTS);
  const { sessionId } = await setUpTimedEntry(db, 'music-button-seed', {
    durationSec: 30,
    unilateral: false,
  });
  return { db, sessionId };
}

const route = (sessionId: string) =>
  ({ key: 'Workout', name: 'Workout', params: { sessionId } }) as never;

describe('Workout music button', () => {
  it('sits in the top bar, outside the scrolling content, and opens the chosen app', async () => {
    const { db, sessionId } = await setUpSession();
    usersRepo.updateUser(db, { musicApp: 'spotify' }, new Date().toISOString());
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    render(
      <StoreProvider>
        <ThemeProvider initialPreference="dark">
          <WorkoutScreen navigation={mockNavigation() as never} route={route(sessionId)} />
        </ThemeProvider>
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('open-music')).toBeTruthy(), WAIT_OPTS);

    // One button, and not in the scroll view (where the Progress chip lives), so scrolling the
    // set or rest away never takes it with it. The theme toggle it replaced is gone.
    expect(screen.getAllByTestId('open-music')).toHaveLength(1);
    expect(within(screen.getByTestId('workout-scroll')).queryByTestId('open-music')).toBeNull();
    expect(screen.queryByTestId('theme-toggle')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('open-music'));
    });
    expect(openURL).toHaveBeenCalledWith('spotify://');
    openURL.mockRestore();
  }, 20000);

  it('is absent when the music app is None', async () => {
    const { db, sessionId } = await setUpSession();
    usersRepo.updateUser(db, { musicApp: 'none' }, new Date().toISOString());
    render(
      <StoreProvider>
        <ThemeProvider initialPreference="dark">
          <WorkoutScreen navigation={mockNavigation() as never} route={route(sessionId)} />
        </ThemeProvider>
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('workout-home')).toBeTruthy(), WAIT_OPTS);
    expect(screen.queryByTestId('open-music')).toBeNull();
  }, 20000);
});

describe('Workout screen in Daybreak', () => {
  it('paints the paper ground and keeps the rep/pause controls themed', async () => {
    const { sessionId } = await setUpSession();
    render(
      inDaybreak(
        <StoreProvider>
          <ThemeProvider initialPreference="light">
            <WorkoutScreen navigation={mockNavigation() as never} route={route(sessionId)} />
          </ThemeProvider>
        </StoreProvider>,
      ),
    );
    await waitFor(() => expect(screen.getByTestId('workout-elapsed')).toBeTruthy(), WAIT_OPTS);
    expect(
      StyleSheet.flatten(screen.getByTestId('workout-screen').props.style)?.backgroundColor,
    ).toBe(daybreak.bg);
    const elapsed = StyleSheet.flatten(screen.getByTestId('workout-elapsed').props.style);
    expect(elapsed.color).toBe(daybreak.text);
  }, 20000);
});
