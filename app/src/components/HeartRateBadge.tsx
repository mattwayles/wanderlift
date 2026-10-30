/**
 * The wearer's heart rate from the Apple Watch, small and quiet, for the top-right of the set's
 * header. Nothing renders without a reading (no watch, out of range): there is no empty slot or
 * "--" placeholder, and no zones, targets or colors that judge the number (invariant 4).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Txt } from '../ui';
import { space } from '../theme';

export function HeartRateBadge({ bpm }: { bpm: number | null }): React.JSX.Element | null {
  if (bpm === null) return null;
  return (
    <View
      testID="heart-rate"
      accessible
      accessibilityLabel={`Heart rate ${bpm} beats per minute`}
      style={styles.row}
    >
      <Icon name="heart" size={16} color="teal" />
      <Txt variant="bodyStrong" testID="heart-rate-bpm">
        {bpm}
      </Txt>
      <Txt variant="caption" color="text2">
        bpm
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
