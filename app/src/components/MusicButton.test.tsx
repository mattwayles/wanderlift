import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { usersRepo } from '@roamfit/store';
import MusicButton from './MusicButton';
import { StoreProvider } from '../state/StoreContext';
import { getDb } from '../db';
import { nowUtcInstant } from '../lib/localClock';
import { ready } from '../ui/test-utils';

async function renderButton() {
  await render(
    <StoreProvider>
      <MusicButton />
    </StoreProvider>,
  );
}

const choose = (musicApp: 'spotify' | 'apple_music' | 'youtube_music' | 'amazon_music' | 'none') =>
  usersRepo.updateUser(getDb(), { musicApp }, nowUtcInstant());

beforeEach(() => {
  usersRepo.ensureUser(getDb(), nowUtcInstant());
});

afterEach(() => jest.restoreAllMocks());

describe('MusicButton', () => {
  it.each([
    ['spotify', 'spotify://', 'Open Spotify'],
    ['apple_music', 'music://', 'Open Apple Music'],
    ['youtube_music', 'youtubemusic://', 'Open YouTube Music'],
    ['amazon_music', 'amazonmusic://', 'Open Amazon Music'],
  ] as const)('opens the chosen app: %s', async (id, scheme, label) => {
    choose(id);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderButton();
    await ready('open-music');
    expect(screen.getByTestId('open-music').props.accessibilityLabel).toBe(label);
    fireEvent.press(screen.getByTestId('open-music'));
    expect(open).toHaveBeenCalledWith(scheme);
  });

  it('falls back to the web page when the app is not installed', async () => {
    choose('spotify');
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('no app'))
      .mockResolvedValue(true);
    await renderButton();
    await ready('open-music');
    fireEvent.press(screen.getByTestId('open-music'));
    await waitFor(() => expect(open).toHaveBeenLastCalledWith('https://open.spotify.com'));
  });

  it('renders nothing when the choice is None', async () => {
    choose('none');
    await renderButton();
    await waitFor(() => expect(screen.queryByTestId('open-music')).toBeNull());
  });

  describe('before any choice', () => {
    beforeEach(() => {
      usersRepo.updateUser(getDb(), { musicApp: null }, nowUtcInstant());
    });

    it('defaults to Spotify when it is installed', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
      await renderButton();
      await ready('open-music');
      expect(screen.getByTestId('open-music').props.accessibilityLabel).toBe('Open Spotify');
    });

    it('falls back to Apple Music when Spotify is not installed', async () => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
      await renderButton();
      await ready('open-music');
      expect(screen.getByTestId('open-music').props.accessibilityLabel).toBe('Open Apple Music');
    });
  });
});
