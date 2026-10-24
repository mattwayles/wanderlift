/**
 * First-launch setup (Track 37h, reworked in Track 51c). It runs once; there is no way back into it
 * (Track 41), because everything it asks is also in Settings or Journey.
 *
 *   value screens -> Where are you starting? -> goal -> What do you have? -> limitations
 *   -> the medical disclaimer -> notification primer -> "Your first week" (plan reveal)
 *
 * Every choice saves the moment it is made, through the same store calls Settings and Generate use,
 * so leaving part-way keeps what was chosen and a relaunch resumes the setup
 * (`users.onboarding_state`): back at "Where are you starting?" with the answers pre-selected, or at
 * the notification primer once the disclaimer has been acknowledged.
 *
 * Starting point (51a) only sets where each trail begins; Journey moves any ladder later. Equipment
 * writes the same state Generate's checklist does (`bandSettings`, `anchorsAvailable`): never
 * anything the engine does not gate on. Picking Bands also marks bands as set up (all five owned to
 * begin with, with the Your bands editor inline) so nobody meets an empty band picker later; a
 * door anchor needs a band, so picking Door turns bands on and says so.
 *
 * The disclaimer (§13.3) is a blocking gate and cannot be skipped. "Skip setup" on the optional
 * steps jumps TO it, never past it, and only the user pressing "I understand" acknowledges it;
 * `finishOnboarding` refuses to finish until then. Someone who skipped goes straight to Today
 * afterwards; everyone else gets the primer and the reveal, whose "Start my first workout" is the
 * last call to action.
 *
 * Track 43: on a fresh install the first screen also offers an iCloud backup when one exists
 * ("Welcome back"). The check is asynchronous and never gates the step; ignoring the offer leaves
 * the decision pending for Settings, and no backup can overwrite iCloud meanwhile.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import { applyStartingPoint, progressionStateRepo, usersRepo } from '@roamfit/store';
import type { Anchor } from '@roamfit/data';
import type { StartingPoint } from '@roamfit/engine';
import { useStore } from '../state/StoreContext';
import { nowEngineClock, nowUtcInstant } from '../lib/localClock';
import { GOAL_GROUP } from '../lib/trainingOptions';
import { DISCLAIMER_TEXT } from '../lib/disclaimer';
import { LOGO_ASPECT, logoFor } from '../lib/brand';
import { STARTING_POINT_OPTIONS } from '../lib/startingPoint';
import { buildProgressionBoard } from '../lib/dashboard';
import { bandsToggled, hasBands } from '../lib/equipment';
import {
  ensureNotificationPermission,
  scheduleMotivationNotifications,
} from '../lib/motivationNotifications';
import { checkForExistingBackup, formatBackupTime, keepThisPhonesData } from '../lib/icloudBackup';
import type { BackupStat } from '../../modules/icloud-backup';
import { useICloudRestore } from '../state/useICloudRestore';
import { makeStyles, space, useTheme } from '../theme';
import { Button, Card, Screen, TopoPattern, Txt } from '../ui';
import { BandSetup } from './BandSetup';
import { KeepPhoneSheet } from './KeepPhoneSheet';
import { LimitationPicker } from './LimitationPicker';
import { CheckRow, Group } from './SettingsList';
import { TrainingOptionPicker } from './TrainingOptionPicker';
import { NotificationPrimer } from './onboarding/NotificationPrimer';
import { PlanReveal } from './onboarding/PlanReveal';
import { ValueScreens } from './onboarding/ValueScreens';

type StepId =
  | 'value'
  | 'start'
  | 'goal'
  | 'equipment'
  | 'limitations'
  | 'disclaimer'
  | 'primer'
  | 'reveal';

/** The steps that ask something, in order; the counter counts these. */
const QUESTION_STEPS = ['start', 'goal', 'equipment', 'limitations', 'disclaimer'] as const;
type QuestionStep = (typeof QUESTION_STEPS)[number];
/** Steps with a "Skip setup" button: it jumps to the disclaimer. */
const SKIPPABLE: readonly StepId[] = ['start', 'goal', 'equipment', 'limitations'];

const STEP_TITLES: Record<StepId, string> = {
  value: 'Welcome to Wanderlift',
  start: 'Where are you starting?',
  goal: 'What are you training for?',
  equipment: 'What do you have?',
  limitations: 'Anything to work around?',
  disclaimer: 'One thing before you start',
  primer: 'A nudge now and then?',
  reveal: 'Your first week',
};

const STEP_INTROS: Partial<Record<StepId, string>> = {
  start:
    'This only sets where each trail begins. Any trail can be moved up or down later on Journey, so there is no wrong answer.',
  goal: 'This sets your reps, rest and sets. Not sure? General fitness suits almost everyone.',
  equipment:
    'Tick everything you can use. Wanderlift only plans moves for what you have, and you can change this any time when you generate a workout.',
  limitations:
    'Wanderlift will leave out anything that loads what you tick. You can change this any time in Settings.',
};

const DOOR_ANCHORS: readonly Anchor[] = ['anchor-low', 'anchor-mid', 'anchor-high'];
const BAR_ANCHOR: Anchor = 'pullup-bar';
const DEFAULT_REMINDER_TIME = '18:00';

export function OnboardingFlow({
  onDone,
  onStartFirstWorkout,
}: {
  onDone: () => void;
  /** Called after setup is finished, to take the user into their first workout. */
  onStartFirstWorkout?: () => void;
}): React.JSX.Element {
  const { db, library, families } = useStore();
  const theme = useTheme();
  const styles = useStyles();
  const [user, setUser] = useState(() => usersRepo.ensureUser(db, nowUtcInstant()));
  // A relaunch mid-setup skips the value screens; once the disclaimer is acknowledged the
  // questions are all done, so it resumes at the notification primer.
  const [step, setStep] = useState<StepId>(() =>
    user.onboardingInProgress ? (user.hasAcknowledgedDisclaimer ? 'primer' : 'start') : 'value',
  );
  const [skipped, setSkipped] = useState(false);
  const [nothingPicked, setNothingPicked] = useState(false);
  const [offer, setOffer] = useState<BackupStat | null>(null);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const { restoring, message, restore } = useICloudRestore();

  useEffect(() => {
    let cancelled = false;
    void checkForExistingBackup(db).then((found) => {
      if (!cancelled && found) setOffer(found);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const refresh = useCallback(() => setUser(usersRepo.getUser(db)!), [db]);
  const save = useCallback(
    (patch: usersRepo.UserPatch) => {
      usersRepo.updateUser(db, patch, nowUtcInstant());
      refresh();
    },
    [db, refresh],
  );

  const questionIndex = QUESTION_STEPS.indexOf(step as QuestionStep);
  useEffect(() => {
    const counted =
      questionIndex >= 0 ? `Step ${questionIndex + 1} of ${QUESTION_STEPS.length}. ` : '';
    AccessibilityInfo.announceForAccessibility(`${counted}${STEP_TITLES[step]}`);
  }, [step, questionIndex]);

  /** Finishes setup and opens Today; false (nothing changes) if the disclaimer was never acknowledged. */
  const complete = useCallback((): boolean => {
    const done = usersRepo.finishOnboarding(db, nowUtcInstant());
    if (done) onDone();
    return done;
  }, [db, onDone]);

  const leaveValueScreens = () => {
    usersRepo.beginOnboarding(db, nowUtcInstant());
    refresh();
    setStep('start');
  };
  const skipToDisclaimer = () => {
    setSkipped(true);
    setStep('disclaimer');
  };
  const acknowledge = () => {
    usersRepo.acknowledgeDisclaimer(db, nowUtcInstant());
    refresh();
    if (skipped) complete();
    else setStep('primer');
  };

  const chooseStartingPoint = (point: StartingPoint) => {
    applyStartingPoint(db, point, families, library.exercises, nowUtcInstant());
    refresh();
  };

  // ---- equipment ----------------------------------------------------------------------------
  const bands = hasBands(user.bandSettings);
  const door = bands && DOOR_ANCHORS.every((a) => user.anchorsAvailable.includes(a));
  const bar = user.anchorsAvailable.includes(BAR_ANCHOR);
  const nothing = nothingPicked && !bands && !door && !bar;
  const withoutDoor = () => user.anchorsAvailable.filter((a) => !DOOR_ANCHORS.includes(a));

  const toggleBands = () => {
    setNothingPicked(false);
    // A band anchor point means nothing without bands: drop the door with them.
    if (bands) save({ bandSettings: bandsToggled(user.bandSettings), anchorsAvailable: withoutDoor() });
    else save({ bandSettings: bandsToggled(user.bandSettings), bandsSetUp: true });
  };
  const toggleDoor = () => {
    setNothingPicked(false);
    if (door) {
      save({ anchorsAvailable: withoutDoor() });
      return;
    }
    save({
      anchorsAvailable: [...new Set([...user.anchorsAvailable, ...DOOR_ANCHORS])],
      ...(bands ? {} : { bandSettings: bandsToggled(user.bandSettings), bandsSetUp: true }),
    });
  };
  const toggleBar = () => {
    setNothingPicked(false);
    save({
      anchorsAvailable: bar
        ? user.anchorsAvailable.filter((a) => a !== BAR_ANCHOR)
        : [...user.anchorsAvailable, BAR_ANCHOR],
    });
  };
  const pickNothing = () => {
    setNothingPicked(true);
    save({
      anchorsAvailable: withoutDoor().filter((a) => a !== BAR_ANCHOR),
      ...(bands ? { bandSettings: bandsToggled(user.bandSettings) } : {}),
    });
  };

  // ---- plan reveal --------------------------------------------------------------------------
  const trails = useMemo(() => {
    if (step !== 'reveal') return [];
    const states = progressionStateRepo.getAllProgressionStates(db);
    return buildProgressionBoard(library, families, states).map((e) => ({
      trailName: e.familyName,
      exerciseName: e.exerciseName,
    }));
  }, [step, db, library, families]);
  const goalLabel = (
    GOAL_GROUP.options.find((o) => o.value === user.trainingPreferences.goal)?.label ?? ''
  ).replace(/\s*\(recommended\)/i, '');

  const enableReminders = (time: string) => {
    usersRepo.updateUser(
      db,
      { notificationPrefs: { motivationEnabled: true, motivationTimes: [time] } },
      nowUtcInstant(),
    );
    refresh();
    // Permission is asked for here, in context. A denial never blocks finishing (the helper
    // swallows it), and Home re-derives the schedule once there is a first session to adapt to.
    void ensureNotificationPermission()
      .then(() =>
        scheduleMotivationNotifications({
          motivationEnabled: true,
          motivationTimes: [time],
          motivationContext: { hero: null },
          todayLocalDate: nowEngineClock().today,
          skipToday: false,
        }),
      )
      .catch(() => undefined);
    setStep('reveal');
  };

  if (step === 'value') {
    return (
      <View style={styles.gate} testID="welcome-gate">
        <TopoPattern seed="wanderlift-gate" strength={0.6} />
        <Screen edges={['top', 'left', 'right']} contentStyle={styles.welcome} style={styles.gateScreen}>
          <View style={styles.welcomeTop}>
            <Image
              source={logoFor(theme.scheme)}
              style={styles.logo}
              resizeMode="contain"
              accessible={false}
              testID="welcome-logo"
            />
            <Txt variant="hero" color="teal" style={styles.wordmark} accessibilityRole="header">
              WANDERLIFT
            </Txt>
            {offer ? (
              <Card testID="restore-offer">
                <Txt variant="bodyStrong">
                  Welcome back — there&apos;s a Wanderlift backup in your iCloud from{' '}
                  {formatBackupTime(offer.modifiedAt)}.
                </Txt>
                {message ? (
                  <Txt variant="small" color="text2" testID="restore-message">
                    {message}
                  </Txt>
                ) : null}
                <Button
                  testID="restore-offer-restore"
                  label={restoring ? 'Restoring…' : 'Restore my data'}
                  disabled={restoring}
                  onPress={() => void restore()}
                />
                <Button
                  testID="restore-offer-fresh"
                  label="Start fresh"
                  variant="secondary"
                  size="md"
                  disabled={restoring}
                  onPress={() => setConfirmFresh(true)}
                />
              </Card>
            ) : null}
          </View>
          <ValueScreens onDone={leaveValueScreens} />
        </Screen>
        <KeepPhoneSheet
          visible={confirmFresh}
          onClose={() => setConfirmFresh(false)}
          title="Start fresh?"
          confirmLabel="Start fresh"
          onConfirm={() => {
            keepThisPhonesData(db);
            setConfirmFresh(false);
            setOffer(null);
          }}
        />
      </View>
    );
  }

  if (step === 'primer') {
    return (
      <NotificationPrimer
        defaultTime={DEFAULT_REMINDER_TIME}
        onEnable={enableReminders}
        onSkip={() => setStep('reveal')}
      />
    );
  }

  if (step === 'reveal') {
    return (
      <PlanReveal
        trails={trails}
        sessionsThisWeek={3}
        goalLabel={goalLabel}
        onStart={() => {
          if (complete()) onStartFirstWorkout?.();
        }}
        onLater={() => void complete()}
      />
    );
  }

  if (step === 'disclaimer') {
    return (
      <View style={styles.gate} testID="disclaimer-gate">
        <TopoPattern seed="wanderlift-gate" strength={0.6} />
        <Screen
          scroll
          edges={['top', 'left', 'right', 'bottom']}
          contentStyle={styles.gateContent}
          style={styles.gateScreen}
        >
          <Txt
            variant="eyebrow"
            color="text3"
            testID="onboarding-progress"
            accessibilityLabel={`Step ${QUESTION_STEPS.length} of ${QUESTION_STEPS.length}`}
          >
            {QUESTION_STEPS.length} of {QUESTION_STEPS.length}
          </Txt>
          <Txt variant="h1" accessibilityRole="header" testID="onboarding-step-disclaimer">
            {STEP_TITLES.disclaimer}
          </Txt>
          <Txt variant="body" color="text2">
            Listen to your body. Wanderlift is here to help you move well, and it is only as
            careful as the information it has. Please read this once.
          </Txt>
          <Card>
            <Txt variant="body" color="text2" testID="disclaimer-gate-text">
              {DISCLAIMER_TEXT}
            </Txt>
          </Card>
          <Button
            testID="disclaimer-acknowledge"
            label="I understand"
            size="lg"
            haptic="medium"
            onPress={acknowledge}
          />
          <Button
            testID="onboarding-back"
            label="Back"
            variant="quiet"
            size="md"
            onPress={() => setStep('limitations')}
          />
        </Screen>
      </View>
    );
  }

  const index = QUESTION_STEPS.indexOf(step as QuestionStep);
  const prev = QUESTION_STEPS[index - 1];
  const nextStep = QUESTION_STEPS[index + 1];

  return (
    <Screen
      scroll
      edges={['top', 'left', 'right']}
      testID="onboarding-screen"
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          {prev ? (
            <Button
              testID="onboarding-back"
              label="Back"
              variant="secondary"
              size="md"
              onPress={() => setStep(prev)}
            />
          ) : null}
          <View style={styles.footerMain}>
            <Button
              testID="onboarding-next"
              label="Continue"
              size="md"
              fullWidth
              onPress={() => setStep(nextStep)}
            />
          </View>
        </View>
      }
    >
      <View style={styles.header}>
        <Txt
          variant="eyebrow"
          color="text3"
          testID="onboarding-progress"
          accessibilityLabel={`Step ${index + 1} of ${QUESTION_STEPS.length}`}
        >
          {index + 1} of {QUESTION_STEPS.length}
        </Txt>
        {SKIPPABLE.includes(step) ? (
          <Button
            testID="onboarding-skip"
            label="Skip setup"
            variant="quiet"
            size="sm"
            accessibilityHint="Keeps the recommended settings for everything not yet chosen, then shows the safety note"
            onPress={skipToDisclaimer}
          />
        ) : null}
      </View>
      <Txt variant="h1" accessibilityRole="header" testID={`onboarding-step-${step}`}>
        {STEP_TITLES[step]}
      </Txt>
      {STEP_INTROS[step] ? (
        <Txt variant="body" color="text2">
          {STEP_INTROS[step]}
        </Txt>
      ) : null}

      {step === 'start' ? (
        <Group title="Where you are today">
          {STARTING_POINT_OPTIONS.map((o) => (
            <CheckRow
              key={o.id}
              testID={`start-${o.id}`}
              label={o.label}
              description={o.description}
              checked={user.startingPoint === o.id}
              single
              onPress={() => {
                if (user.startingPoint !== o.id) chooseStartingPoint(o.id);
              }}
            />
          ))}
        </Group>
      ) : null}

      {step === 'goal' ? (
        <TrainingOptionPicker
          group={GOAL_GROUP}
          value={user.trainingPreferences.goal}
          onChange={(goal) => save({ trainingPreferences: { goal } })}
        />
      ) : null}

      {step === 'equipment' ? (
        <>
          <Group title="Tick all that apply">
            <CheckRow
              testID="equip-nothing"
              label="Nothing but me"
              description="Bodyweight workouts, anywhere."
              checked={nothing}
              onPress={pickNothing}
            />
            <CheckRow
              testID="equip-bands"
              label="Resistance bands"
              description="Loop bands for banded exercises."
              checked={bands}
              onPress={toggleBands}
            />
            <CheckRow
              testID="equip-door"
              label="A door"
              description="Somewhere to anchor a band at low, mid and high heights."
              checked={door}
              onPress={toggleDoor}
            />
            <CheckRow
              testID="equip-bar"
              label="A pull-up bar"
              description="Takes your full hanging weight."
              checked={bar}
              onPress={toggleBar}
            />
          </Group>
          {door ? (
            <Txt variant="small" color="text2" testID="equip-door-note">
              A door anchor holds a band, so bands are ticked too.
            </Txt>
          ) : null}
          {bands ? (
            <BandSetup
              settings={user.bandSettings}
              tensions={user.bandTensions}
              onChangeSettings={(bandSettings) => save({ bandSettings, bandsSetUp: true })}
              onChangeTension={(band, patch) => {
                usersRepo.updateBandTension(db, band, patch, nowUtcInstant());
                save({ bandsSetUp: true });
              }}
            />
          ) : null}
        </>
      ) : null}

      {step === 'limitations' ? (
        <LimitationPicker
          selected={user.limitationChoices.map((c) => c.id)}
          onChange={(ids) => {
            usersRepo.setLimitationChoices(db, ids, nowEngineClock().today, nowUtcInstant());
            refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((tk) =>
  StyleSheet.create({
    gate: { flex: 1, backgroundColor: tk.colors.bg },
    gateScreen: { backgroundColor: 'transparent' },
    gateContent: { gap: space.xl, paddingVertical: space.xxl },
    welcome: { gap: space.md },
    welcomeTop: { gap: space.sm, paddingTop: space.md },
    // Decorative: the wordmark below is the header. Negative margin pulls the glow padding in.
    logo: { width: 96, height: 96 / LOGO_ASPECT, marginBottom: -space.sm },
    wordmark: { textAlign: 'left' },
    content: { paddingTop: space.md, gap: space.xl },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    footerMain: { flex: 1 },
  }),
);
