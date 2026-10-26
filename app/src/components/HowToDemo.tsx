/**
 * The demo slot under an exercise's "How to" cue, on the detail page and on the workout's exercise
 * and rest pages. The cue text above it is the real instruction. Online, a YouTube search for the
 * exercise is the working demo; it opens the link and nothing else (no player, no saved video).
 * Offline a search link is a dead end, so it is hidden and returns with connectivity.
 *
 * Under it sits one plain line saying in-app video demos are on the way. It is a note, not a
 * stand-in for a missing clip: there is no empty tile or placeholder box, which App Review's
 * completeness rule (2.1(a), "placeholder ... and other temporary content should be scrubbed")
 * reads as unfinished. When bundled clips ship (they play offline) they replace this component's
 * body, and the note goes with it.
 */
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Icon, Txt } from '../ui';
import { makeStyles, space } from '../theme';
import { youtubeSearchUrl } from '../lib/youtubeSearch';
import { useIsOnline } from '../lib/networkStatus';

export default function HowToDemo({ exerciseName }: { exerciseName: string }): React.JSX.Element {
  const styles = useStyles();
  const online = useIsOnline();
  return (
    <View style={styles.wrap}>
      {online && (
        <Button
          testID="how-to-video-link"
          label="Watch a demo"
          variant="secondary"
          size="md"
          icon="external"
          iconRight
          fullWidth
          onPress={() => {
            Linking.openURL(youtubeSearchUrl(exerciseName)).catch(() => {});
          }}
        />
      )}
      <View style={styles.note} testID="how-to-demo-note" accessible>
        <Icon name="video" size={16} color="text3" />
        <Txt variant="small" color="text3" style={styles.noteText}>
          Short video demos are on the way.
        </Txt>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    note: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    noteText: { flex: 1 },
  }),
);
