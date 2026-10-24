/**
 * Track 51b — "Your first week", shown at the end of setup. Props-driven: the caller supplies each
 * ladder's starting move and decides what Start / Look around do. The entrance is the app's own
 * `Enter` motion (native driver, instant under Reduce Motion). Rest days are drawn as rest, not
 * as gaps (invariant 4). Motivating, not demanding: a hero opener, an icon week strip with today
 * ringed, and each trail's starting move with its own glyph.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { nowEngineClock } from '../../lib/localClock';
import { makeStyles, radius, space } from '../../theme';
import { Button, Card, Enter, Icon, Screen, Txt, type IconName } from '../../ui';
import { firstWeek } from './weekDays';

export interface PlanRevealTrail {
  trailName: string;
  exerciseName: string;
}

/** A glyph for a trail by name; the names come from the ladders, so match loosely. */
export function trailIcon(trailName: string): IconName {
  const n = trailName.toLowerCase();
  if (n.includes('push')) return 'push';
  if (n.includes('pull')) return 'pull';
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg') || n.includes('hinge'))
    return 'walk';
  if (n.includes('core') || n.includes('abs')) return 'core';
  return 'flag';
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
          <View style={styles.cardHead}>
            <Icon name="sparkles" size={18} color="gold" />
            <Txt variant="bodyStrong" style={styles.flex}>
              {sessions === 1 ? 'One session' : `${sessions} sessions`} this week, with rest in
              between.
            </Txt>
          </View>
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
                <Icon
                  name={d.isTraining ? 'bolt' : 'moon'}
                  size={18}
                  color={d.isTraining ? 'ink' : 'text3'}
                />
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
            <View style={styles.trail}>
              <View style={styles.trailBadge}>
                <Icon name={trailIcon(t.trailName)} size={20} color="ink" />
              </View>
              <View style={styles.flex}>
                <Txt variant="small" color="text3">
                  {t.trailName}
                </Txt>
                <Txt variant="bodyStrong">{t.exerciseName}</Txt>
              </View>
            </View>
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
    flex: { flex: 1 },
    hero: { gap: space.sm, minHeight: 190, justifyContent: 'flex-end' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
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
    trail: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    trailBadge: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.teal,
    },
    closer: { textAlign: 'center', paddingHorizontal: space.md },
  }),
);
