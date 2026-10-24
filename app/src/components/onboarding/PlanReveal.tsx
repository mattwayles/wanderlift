/**
 * Track 51b — "Your first week", shown at the end of setup. Props-driven: the caller supplies each
 * ladder's starting move and decides what Start / Look around do. The entrance is the app's own
 * `Enter` motion (native driver, instant under Reduce Motion). Rest days are drawn as rest, not
 * as gaps (invariant 4).
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { nowEngineClock } from '../../lib/localClock';
import { makeStyles, radius, space } from '../../theme';
import { Button, Card, Enter, Screen, Txt } from '../../ui';
import { firstWeek } from './weekDays';

export interface PlanRevealTrail {
  trailName: string;
  exerciseName: string;
}

export interface PlanRevealProps {
  trails: PlanRevealTrail[];
  /** Suggested sessions this week (1-4 is sensible; clamped for the strip). */
  sessionsThisWeek: number;
  goalLabel: string;
  /** Today's `local_date`; defaults to the device's. Passed in by tests. */
  today?: string;
  onStart: () => void;
  onLater: () => void;
}

export function PlanReveal({
  trails,
  sessionsThisWeek,
  goalLabel,
  today,
  onStart,
  onLater,
}: PlanRevealProps): React.JSX.Element {
  const styles = useStyles();
  const start = today ?? nowEngineClock().today;
  const week = useMemo(() => firstWeek(start, sessionsThisWeek), [start, sessionsThisWeek]);
  const sessions = week.filter((d) => d.isTraining).length;

  return (
    <Screen
      scroll
      testID="plan-reveal"
      edges={['top', 'left', 'right']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button testID="plan-start" label="Start my first workout" size="lg" onPress={onStart} />
          <Button
            testID="plan-later"
            label="Look around first"
            variant="quiet"
            size="md"
            onPress={onLater}
          />
        </View>
      }
    >
      <Enter index={0}>
        <Txt variant="eyebrow" color="gold">
          Your first week
        </Txt>
        <Txt variant="h1" accessibilityRole="header">
          Here is a gentle start.
        </Txt>
        <Txt variant="body" color="text2" testID="plan-goal">
          Goal: {goalLabel}
        </Txt>
      </Enter>

      <Enter index={1}>
        <Card>
          <Txt variant="bodyStrong">
            {sessions === 1 ? 'One session' : `${sessions} sessions`} this week, with rest in
            between.
          </Txt>
          <View style={styles.strip} testID="plan-week">
            {week.map((d) => (
              <View
                key={d.date}
                testID={`plan-day-${d.date}`}
                accessible
                accessibilityLabel={`${d.isToday ? 'Today' : d.weekday} ${d.dayOfMonth}, ${
                  d.isTraining ? 'workout' : 'rest'
                }`}
                style={[styles.day, d.isTraining && styles.dayTraining]}
              >
                <Txt variant="caption" color={d.isTraining ? 'ink' : 'text3'}>
                  {d.weekday}
                </Txt>
                <Txt variant="small" color={d.isTraining ? 'ink' : 'text2'}>
                  {d.isTraining ? 'Go' : 'Rest'}
                </Txt>
              </View>
            ))}
          </View>
          <Txt variant="small" color="text2">
            Rest is when you get stronger. Move a day whenever life needs it.
          </Txt>
        </Card>
      </Enter>

      <Enter index={2}>
        <Card>
          <Txt variant="bodyStrong">Where each trail begins</Txt>
          {trails.map((t) => (
            <View key={t.trailName} style={styles.trail} testID={`plan-trail-${t.trailName}`}>
              <Txt variant="small" color="text3">
                {t.trailName}
              </Txt>
              <Txt variant="body">{t.exerciseName}</Txt>
            </View>
          ))}
        </Card>
      </Enter>
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    content: { gap: space.lg, paddingTop: space.xl },
    footer: { gap: space.sm },
    strip: { flexDirection: 'row', gap: space.xs },
    day: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: space.sm,
      borderRadius: radius.sm,
      backgroundColor: t.colors.surface2,
    },
    dayTraining: { backgroundColor: t.colors.teal },
    trail: { gap: 2, paddingTop: space.sm },
  }),
);
