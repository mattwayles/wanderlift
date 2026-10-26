/**
 * Settings' legal links, "Export my data" and "Delete all data". Its own file because the delete
 * test really wipes this file's database, which the other Settings tests share.
 */
import React from 'react';
import { Linking, Share } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { usersRepo } from '@roamfit/store';
import RootNavigator from '../navigation/RootNavigator';
import { StoreProvider } from '../state/StoreContext';
import { ThemeProvider } from '../state/ThemeProvider';
import { getDb } from '../db';
import { nowUtcInstant } from '../lib/localClock';
import { PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { midnightTheme } from '../theme';
import { WAIT, ready } from '../ui/test-utils';

beforeEach(() => {
  usersRepo.ensureUser(getDb(), nowUtcInstant());
  usersRepo.acknowledgeDisclaimer(getDb(), nowUtcInstant());
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function openSettings() {
  await render(
    <StoreProvider>
      <ThemeProvider>
        <NavigationContainer theme={midnightTheme.navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </StoreProvider>,
  );
  await ready('open-settings');
  await fireEvent.press(screen.getByTestId('open-settings'));
  await ready('settings-screen');
}

describe('legal links', () => {
  it('opens the hosted privacy policy and terms, and says so calmly when it cannot', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openSettings();
    await fireEvent.press(screen.getByTestId('settings-privacy'));
    await waitFor(() => expect(open).toHaveBeenCalledWith(PRIVACY_URL));
    await fireEvent.press(screen.getByTestId('settings-terms'));
    await waitFor(() => expect(open).toHaveBeenCalledWith(TERMS_URL));

    open.mockRejectedValueOnce(new Error('no browser'));
    await fireEvent.press(screen.getByTestId('settings-terms'));
    await waitFor(() => expect(screen.getByText(/Couldn't open the page/)).toBeTruthy());
  });
});

describe('export my data', () => {
  it('hands the share sheet the user data as JSON', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await openSettings();
    await fireEvent.press(screen.getByTestId('settings-export-data'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const { message } = share.mock.calls[0]![0] as { message: string };
    const parsed = JSON.parse(message) as { app: string; tables: Record<string, unknown[]> };
    expect(parsed.app).toBe('wanderlift');
    expect(parsed.tables.users).toHaveLength(1);
  });

  it('says so when the share sheet cannot open', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
    await openSettings();
    await fireEvent.press(screen.getByTestId('settings-export-data'));
    await waitFor(() => expect(screen.getByText(/Couldn't open the share sheet/)).toBeTruthy());
  });
});

describe('delete all data', () => {
  it('asks first, keeps everything on "Keep my data", and erases on confirm', async () => {
    await openSettings();
    await fireEvent.press(screen.getByTestId('settings-delete-data'));
    await waitFor(() => expect(screen.getByTestId('delete-sheet')).toBeTruthy());
    expect(usersRepo.getUser(getDb())).not.toBeNull();

    await fireEvent.press(screen.getByTestId('delete-confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('delete-sheet')).toBeNull(), WAIT);
    expect(usersRepo.getUser(getDb())!.hasAcknowledgedDisclaimer).toBe(true);

    await fireEvent.press(screen.getByTestId('settings-delete-data'));
    await waitFor(() => expect(screen.getByTestId('delete-confirm-yes')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('delete-confirm-yes'));
    // The app restarts on the emptied database and is back at first run: a fresh, unacknowledged user.
    await waitFor(() => {
      const user = usersRepo.getUser(getDb());
      expect(user === null || user.hasAcknowledgedDisclaimer === false).toBe(true);
    }, WAIT);
    await waitFor(() => expect(screen.queryByTestId('settings-screen')).toBeNull(), WAIT);
  });
});
