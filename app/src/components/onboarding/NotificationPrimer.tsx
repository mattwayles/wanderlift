/**
 * Track 51b — the friendly step before the system notification prompt. It only collects a time
 * and reports a choice: it never requests permission and never schedules anything. The caller does
 * both inside `onEnable(time)`. The time picker is the one Settings uses for motivation times.
 * Copy is a gentle offer, never nagging or streak guilt (invariant 4).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { dateToTime, timeToDate } from '../../lib/motivationNotifications';
import { makeStyles, space } from '../../theme';
import { Button, Card, Screen, Txt } from '../../ui';

export interface NotificationPrimerProps {
  /** "HH:MM" 24-hour local time the picker starts on. */
  defaultTime: string;
  /** The chosen "HH:MM". The caller asks for permission and schedules. */
  onEnable: (time: string) => void;
  onSkip: () => void;
}

export function NotificationPrimer({
  defaultTime,
  onEnable,
  onSkip,
}: NotificationPrimerProps): React.JSX.Element {
  const styles = useStyles();
  const [time, setTime] = useState(defaultTime);

  return (
    <Screen
      scroll
      testID="notification-primer"
      edges={['top', 'left', 'right']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button
            testID="primer-enable"
            label="Turn on reminders"
            size="lg"
            onPress={() => onEnable(time)}
          />
          <Button testID="primer-skip" label="Not now" variant="quiet" size="md" onPress={onSkip} />
        </View>
      }
    >
      <Txt variant="eyebrow" color="gold">
        A gentle nudge
      </Txt>
      <Txt variant="h1" accessibilityRole="header">
        Want a friendly reminder?
      </Txt>
      <Txt variant="body" color="text2">
        One quiet nudge a day, at a time you pick. If you have already trained, or you are
        travelling, it stays out of the way. You can change or stop it any time in Settings.
      </Txt>
      <Card>
        <View style={styles.row}>
          <Txt variant="bodyStrong">Remind me at</Txt>
          <DateTimePicker
            testID="primer-time-picker"
            mode="time"
            display="compact"
            value={timeToDate(time)}
            minuteInterval={5}
            accessibilityLabel="Reminder time"
            onValueChange={(_event, picked) => setTime(dateToTime(picked))}
          />
        </View>
      </Card>
      <Txt variant="small" color="text3">
        Next, iOS will ask whether Wanderlift may send notifications.
      </Txt>
    </Screen>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    content: { gap: space.lg, paddingTop: space.xl },
    footer: { gap: space.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  }),
);
