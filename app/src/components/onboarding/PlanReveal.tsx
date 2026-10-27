/**
 * Track 51b — "Your first week", shown at the end of setup. Props-driven: the caller supplies each
 * ladder's starting move and decides what Start / Look around do. The entrance is the app's own
 * `Enter` motion (native driver, instant under Reduce Motion). Rest days are drawn as rest, not
 * as gaps (invariant 4). Motivating, not demanding: a hero opener, a week strip with today ringed,
 * and each trail's starting move. No decorative glyphs: the words carry the meaning.
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
        <Card variant="hero" seed="wanderlift-first-week" style={styles.hero}>
          <Txt variant="eyebrow" color="ink">
            Your first week
          </Txt>
          <Txt variant="display" color="ink" accessibilityRole="header">
            Your trail starts today.
          </Txt>
          <Txt variant="body" color="ink" testID="plan-goal">
            Goal: {goalLabel}
          </Txt>
        </Card>
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
                style={[
                  styles.day,
                  d.isTraining && styles.dayTraining,
                  d.isToday && styles.dayToday,
                ]}
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
        <Txt variant="eyebrow" color="gold">
          Where each trail begins
        </Txt>
      </Enter>
      {trails.map((t, i) => (
        <Enter key={t.trailName} index={3 + i}>
          <Card padding="md" testID={`plan-trail-${t.trailName}`}>
            <Txt variant="small" color="text3">
              {t.trailName}
            </Txt>
            <Txt variant="bodyStrong">{t.exerciseName}</Txt>
          </Card>
        </Enter>
      ))}

      <Enter index={4 + trails.length}>
        <Txt variant="body" color="text2" style={styles.closer}>
          Every move is a ladder. Show up, and Wanderlift climbs it with you.
        </Txt>
      </Enter>
    </Screen>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    content: { gap: space.lg, paddingTop: space.xl },
    footer: { gap: space.sm },
    hero: { gap: space.sm, minHeight: 190, justifyContent: 'flex-end' },
    strip: { flexDirection: 'row', gap: space.xs, marginVertical: space.sm },
    day: {
      flex: 1,
      alignItems: 'center',
      gap: space.xs,
      paddingVertical: space.sm,
      borderRadius: radius.sm,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: t.colors.surface2,
    },
    dayTraining: { backgroundColor: t.colors.teal },
    dayToday: { borderColor: t.colors.gold },
    closer: { textAlign: 'center', paddingHorizontal: space.md },
  }),
);
