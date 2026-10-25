/**
 * The music apps the workout's button can open. Opening is all we do: a URL scheme for the app, a
 * web page when the scheme isn't handled. No playback control, no auth, no network call of ours.
 *
 * `users.music_app` is null until the user picks one in Settings; until then the choice resolves
 * to Spotify when it is installed, otherwise Apple Music. Only Spotify is probed with
 * `canOpenURL`, so `spotify` is the one entry in `LSApplicationQueriesSchemes` (app.json);
 * opening the others needs no allow-listing.
 */
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { usersRepo, type MusicApp } from '@roamfit/store';
import { useStore } from '../state/StoreContext';
import { nowUtcInstant } from './localClock';

export interface MusicAppInfo {
  id: Exclude<MusicApp, 'none'>;
  label: string;
  scheme: string;
  webUrl: string;
  /** FontAwesome glyph for the button. Apple Music has no brand glyph in the set, so it is a
   *  music note; the others are the services' own marks. */
  glyph: 'spotify' | 'music' | 'youtube-play' | 'amazon';
  /** Brand colour, used only on that app's glyph. */
  color: string;
}

export const MUSIC_APP_INFO: MusicAppInfo[] = [
  { id: 'spotify', label: 'Spotify', scheme: 'spotify://', webUrl: 'https://open.spotify.com', glyph: 'spotify', color: '#1DB954' },
  { id: 'apple_music', label: 'Apple Music', scheme: 'music://', webUrl: 'https://music.apple.com', glyph: 'music', color: '#FA243C' },
  { id: 'youtube_music', label: 'YouTube Music', scheme: 'youtubemusic://', webUrl: 'https://music.youtube.com', glyph: 'youtube-play', color: '#FF0000' },
  { id: 'amazon_music', label: 'Amazon Music', scheme: 'amazonmusic://', webUrl: 'https://music.amazon.com', glyph: 'amazon', color: '#00A8E1' },
];

export function musicAppInfo(id: MusicApp): MusicAppInfo | null {
  return MUSIC_APP_INFO.find((a) => a.id === id) ?? null;
}

/** Spotify if it is installed, else Apple Music (which ships with iOS). */
export async function defaultMusicApp(): Promise<MusicApp> {
  try {
    return (await Linking.canOpenURL('spotify://')) ? 'spotify' : 'apple_music';
  } catch {
    return 'apple_music';
  }
}

export function openMusicApp(app: MusicAppInfo): void {
  Linking.openURL(app.scheme).catch(() => {
    Linking.openURL(app.webUrl).catch(() => {});
  });
}

/** The effective choice (stored, else the resolved default; null while that resolves) and a
 *  setter that stores it. */
export function useMusicApp(): { app: MusicApp | null; setApp: (next: MusicApp) => void } {
  const { db } = useStore();
  const [app, setAppState] = useState<MusicApp | null>(() => usersRepo.getUser(db)?.musicApp ?? null);
  useEffect(() => {
    if (app !== null) return;
    let live = true;
    defaultMusicApp().then((d) => live && setAppState(d));
    return () => {
      live = false;
    };
  }, [app]);
  const setApp = (next: MusicApp): void => {
    usersRepo.updateUser(db, { musicApp: next }, nowUtcInstant());
    setAppState(next);
  };
  return { app, setApp };
}
