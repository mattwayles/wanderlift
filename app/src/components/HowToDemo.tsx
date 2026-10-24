/**
 * The demo slot under an exercise's "How to" cue, on the detail page and on the workout's exercise
 * and rest pages. Per-exercise clips are still being filmed, so the slot is a "coming soon" tile
 * for every exercise - a promise, not an apology; the cue text above it is the real instruction.
 * When the clips ship (bundled, so they play offline) they replace the tile here.
 *
 * Online, a YouTube search for the exercise sits under the tile, labelled "In the meantime". It
 * opens the link and nothing else: there is no player and no saved video. Hidden while offline (a
 * search link is a dead end without a connection); it returns when connectivity does.
 */
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Icon, Txt } from '../ui';
import { makeStyles, radius, space } from '../theme';
import { youtubeSearchUrl } from '../lib/youtubeSearch';
import { useIsOnline } from '../lib/networkStatus';

export default function HowToDemo({ exerciseName }: { exerciseName: string }): React.JSX.Element {
  const styles = useStyles();
  const online = useIsOnline();
  return (
    <View style={styles.wrap}>
      <View
        testID="how-to-demo-soon"
        accessible
        accessibilityLabel="Video demo coming soon. We're filming every move."
        style={styles.tile}
      >
        <Icon name="video" size={22} color="fern" />
        <View style={styles.tileText}>
          <Txt variant="bodyStrong">Video demo coming soon</Txt>
          <Txt variant="small" color="text2">
            We're filming every move. Until then, the steps above have you covered.
          </Txt>
        </View>
      </View>
      {online && (
        <View style={styles.meantime}>
          <Txt variant="eyebrow" color="text3">
            In the meantime
          </Txt>
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
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: space.md },
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.lineStrong,
      backgroundColor: t.colors.surface2,
    },
    tileText: { flex: 1, gap: 2 },
    meantime: { gap: space.xs },
  }),
);
