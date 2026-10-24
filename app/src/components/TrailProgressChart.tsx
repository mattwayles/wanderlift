/**
 * The chart drawn inside each Trail card on Journey (`lib/trailProgress.ts` builds all of it): one
 * graph per level, with ‹ › arrows to page between the levels the user has trained and a small
 * Progress / Best set toggle.
 *
 * - **One level per graph.** A move up a rung is a harder exercise, so the best set falls even
 *   though the user progressed; on one shared line that read as a regression. Each level is its own
 *   page, titled "Level 2 · Pull-up" with its session count and dates, and the card opens on the level
 *   of the latest session. Earlier levels are a tap back — progress over time, level by level.
 * - **Progress** (default): steps up this level, so moving to a heavier band and doing fewer reps
 *   reads as a step forward, which is what it is.
 * - **Best set**: not a graph — a tile per exercise at this level: its top reps or seconds, big,
 *   at the heaviest band it was done with (that band as the user's own colour chip).
 *
 * Progress is hidden on a page where no session could be placed on the ladder, and that page falls
 * back to Best set. Nothing here is styled as a decline (invariant 4).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { makeStyles, radius, space } from '../theme';
import { Chip, Icon, IconButton, Txt } from '../ui';
import BandChip from './BandChip';
import type { BandTensions } from '../lib/bandDisplay';
import { ProgressChart } from './ProgressChart';
import { formatLocalDate } from '../lib/exerciseProgress';
import { bestSetLabel, steps, type BestSetStat } from '../lib/ladderSeries';
import type { ProgressUnit } from '../lib/exerciseProgress';
import type { TrailProgress } from '../lib/trailProgress';

export interface TrailProgressChartProps {
  familyId: string;
  progress: TrailProgress;
  /** The user's band colours, for the Best set tiles. Without them a band shows by its id. */
  tensions?: BandTensions;
}

type Mode = 'progress' | 'best';

export function TrailProgressChart({
  familyId,
  progress,
  tensions,
}: TrailProgressChartProps): React.JSX.Element | null {
  const styles = useStyles();
  const [picked, setPicked] = useState<Mode>('progress');
  // null = the level of the latest session; clamped in case a reload dropped a page.
  const [pickedPage, setPickedPage] = useState<number | null>(null);
  const pages = progress.levels;
  const charted = pages.some((p) => p.ladder.points.length > 0 || p.bests.length > 0);
  // Nothing measured on this trail yet: the card already says where you stand, so no empty chart.
  if (!charted) return null;

  const index = Math.min(Math.max(pickedPage ?? progress.currentLevel, 0), pages.length - 1);
  const page = pages[index];
  const hasProgress = page.ladder.points.length > 0;
  const hasBest = page.bests.length > 0;
  const mode: Mode = hasProgress && (picked === 'progress' || !hasBest) ? 'progress' : 'best';
  const unit = page.unit;
  const best = page.bests;

  return (
    <View style={styles.wrap} testID={`board-chart-${familyId}`}>
      <View style={styles.head}>
        <Txt variant="eyebrow" color="text3">
          {mode === 'progress' ? 'Progress per session' : 'Best set'}
        </Txt>
        {hasProgress && hasBest ? (
          <View style={styles.toggle}>
            <Chip
              testID={`board-chart-mode-progress-${familyId}`}
              label="Progress"
              size="sm"
              tone="sky"
              selected={mode === 'progress'}
              onPress={() => setPicked('progress')}
            />
            <Chip
              testID={`board-chart-mode-best-${familyId}`}
              label="Best set"
              size="sm"
              tone="sky"
              selected={mode === 'best'}
              onPress={() => setPicked('best')}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.pager}>
        {pages.length > 1 ? (
          <IconButton
            testID={`board-level-prev-${familyId}`}
            icon="back"
            size="sm"
            variant="plain"
            tone={index > 0 ? 'text' : 'text3'}
            disabled={index === 0}
            accessibilityLabel="Previous level"
            onPress={() => setPickedPage(index - 1)}
          />
        ) : null}
        <View style={styles.pageTitle} testID={`board-level-title-${familyId}`}>
          <Txt variant="h3" align="center" numberOfLines={1}>
            {`Level ${page.n} · ${page.name}`}
          </Txt>
          <Txt variant="caption" color="text3" align="center">
            {`${page.sessions} ${page.sessions === 1 ? 'session' : 'sessions'} · ${formatLocalDate(page.firstDate)}${page.latestDate !== page.firstDate ? ` – ${formatLocalDate(page.latestDate)}` : ''}`}
          </Txt>
        </View>
        {pages.length > 1 ? (
          <IconButton
            testID={`board-level-next-${familyId}`}
            icon="chevronRight"
            size="sm"
            variant="plain"
            tone={index < pages.length - 1 ? 'text' : 'text3'}
            disabled={index === pages.length - 1}
            accessibilityLabel="Next level"
            onPress={() => setPickedPage(index + 1)}
          />
        ) : null}
      </View>

      {!hasProgress && !hasBest ? (
        <Txt variant="caption" color="text3" testID={`board-level-unmeasured-${familyId}`}>
          Logged at this level, with no counted sets to chart.
        </Txt>
      ) : mode === 'progress' ? (
        <>
          <ProgressChart
            key={`progress-${page.levelId}`}
            testID={`board-chart-plot-${familyId}`}
            title={`Level ${page.n} progress`}
            points={page.ladder.points}
            formatValue={steps}
            yLabel="Steps up this level"
            integerTicks
            zeroBase
            height={140}
            describeValue={(i) => page.ladder.labels[i] ?? null}
            describePoint={(i) => page.ladder.pointExercise[i] ?? null}
          />
          {/* What a step is, is explained once above all the Trails (JourneyScreen), not here. */}
        </>
      ) : (
        <View style={styles.stats} testID={`board-best-stats-${familyId}`}>
          <View style={styles.tiles}>
            {best.map((stat) => (
              <BestSetTile
                key={stat.exerciseId}
                testID={`board-best-stat-${familyId}-${stat.exerciseId}`}
                stat={stat}
                unit={unit}
                tensions={tensions}
              />
            ))}
          </View>
          <Txt variant="caption" color="text3">
            Each exercise's top set at the heaviest band you've used.
          </Txt>
        </View>
      )}
    </View>
  );
}

/** One exercise's best set: the number big, its unit beside it, the band as the user's own colour
 *  chip (or "Bodyweight"), the exercise under it. Gold, like every other personal best in the app. */
function BestSetTile({
  stat,
  unit,
  tensions,
  testID,
}: {
  stat: BestSetStat;
  unit: ProgressUnit | null;
  tensions: BandTensions | undefined;
  testID: string;
}): React.JSX.Element {
  const styles = useStyles();
  const label = unit ? bestSetLabel(unit, stat.value, stat.band) : String(stat.value);
  const unitWord = unit === 'seconds' ? 'sec' : unit ? (stat.value === 1 ? 'rep' : 'reps') : '';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${stat.name}, best set ${label}`}
      style={styles.tile}
    >
      <View style={styles.tileTop}>
        <Icon name="trophy" size={16} color="gold" />
        {stat.band ? (
          <BandChip band={stat.band} tensions={tensions ?? ({} as BandTensions)} />
        ) : (
          <Txt variant="eyebrow" color="text3">
            Bodyweight
          </Txt>
        )}
      </View>
      <View style={styles.tileValue}>
        <Txt variant="display" style={styles.tileNumber}>
          {String(stat.value)}
        </Txt>
        {unitWord ? (
          <Txt variant="eyebrow" color="gold">
            {unitWord}
          </Txt>
        ) : null}
      </View>
      <Txt variant="small" color="text2" numberOfLines={2}>
        {stat.name}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
    },
    toggle: { flexDirection: 'row', gap: space.sm },
    pager: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    pageTitle: { flex: 1, alignItems: 'center' },
    stats: { gap: space.sm },
    // Two across; a lone tile (or the odd one out) takes the full row.
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    tile: {
      flexGrow: 1,
      flexBasis: '45%',
      gap: space.xs,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: t.tints.gold,
    },
    tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
    tileNumber: { fontVariant: ['tabular-nums'] },
  }),
);
