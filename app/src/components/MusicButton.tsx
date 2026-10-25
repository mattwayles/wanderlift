/**
 * A small glyph for the user's chosen music app (Settings; see `lib/musicApps.ts`) that opens that
 * app and nothing else: no playback control, no auth, no network call of ours. Falls back to the
 * service's web page when the app isn't installed. Renders nothing when the choice is "None".
 * Brand colours are allowed only as this glyph.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { PressableScale } from '../ui';
import { makeStyles } from '../theme';
import { musicAppInfo, openMusicApp, useMusicApp } from '../lib/musicApps';

export default function MusicButton(): React.JSX.Element | null {
  const styles = useStyles();
  const { app } = useMusicApp();
  const info = app ? musicAppInfo(app) : null;
  if (!info) return null;
  return (
    <PressableScale
      testID="open-music"
      onPress={() => openMusicApp(info)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${info.label}`}
      hitSlop={8}
      style={styles.disc}
    >
      <FontAwesome name={info.glyph} size={20} color={info.color} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    disc: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surface2,
      borderWidth: 1,
      borderColor: t.colors.line,
    },
  }),
);
