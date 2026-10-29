/**
 * Track 39b - the Passport book. One page at a time inside a "book" frame that fills the screen: cover, bio, contents
 * (two or more countries), visa pages of stamps, and the travel-badge endorsements. 39c adds the page turn:
 * the screen owns `pageIndex`; `PassportBook` runs the page turn (components/PageTurnBook.tsx)
 * and `PassportPage` draws whichever page it is handed.
 *
 * Never punish (invariant 4): a stamp is a souvenir, an unfilled last page simply ends, and
 * nothing here reads as something missing or overdue. Dates are `local_date`s (invariant 6).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import type { RootScreenProps } from '../navigation/types';
import { progressText, type ShelfBadge } from '../lib/badges';
import { monthShortName, type PassportEntry } from '../lib/dashboard';
import { formatFullLocalDate } from '../lib/sessionHistory';
import { useDashboardData } from '../lib/useDashboardData';
import {
  bookPageForCountry,
  bookPageForLabel,
  buildPassportBook,
  type PassportBookPage,
} from '../lib/passportBook';
import { makeStyles, radius, space, useTheme } from '../theme';
import { Icon, PressableScale, Screen, Sheet, Stamp, Txt } from '../ui';
import { useInsets } from '../ui/useInsets';
import { BadgeEmblem } from '../components/BadgeEmblem';
import { EmptyState } from '../components/EmptyState';
import { PassportOptInCard } from '../components/PassportOptInCard';
import { PageTurnLayers, usePageTurn } from '../components/PageTurnBook';
import { stampLayout } from '../lib/passportStamps';

type Props = RootScreenProps<'Passport'>;

/** `2026-09-03` -> `Sep 3, 2026`, from the parts of the `local_date` (invariant 6). */
function shortDate(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  if (!y || !m || !d) return localDate;
  return `${monthShortName(m)} ${d}, ${y}`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Guilloche-style security lines: a few phase-shifted waves behind the page content. */
const GUILLOCHE_PATHS: string[] = Array.from({ length: 9 }, (_, k) => {
  const pts: string[] = [];
  for (let x = 0; x <= 100; x += 4) {
    const y = 14 + k * 14 + Math.sin((x / 100) * Math.PI * 4 + k * 0.7) * 5;
    pts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)}`);
  }
  return pts.join(' ');
});

function Guilloche(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      {GUILLOCHE_PATHS.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill="none"
          stroke={theme.colors.line}
          strokeWidth={0.5}
          opacity={0.6}
        />
      ))}
    </Svg>
  );
}

/** Where the page sits in the book, and how a screen reader moves it (the bar is reference only). */
export interface PageNavInfo {
  index: number;
  count: number;
  onAdjust: (e: AccessibilityActionEvent) => void;
}

export interface PassportPageProps {
  page: PassportBookPage;
  nav?: PageNavInfo;
  onOpenStamp: (entry: PassportEntry) => void;
  onSelectCountry: (country: string) => void;
  onOpenBadges: () => void;
}

/**
 * Every page is the same height: the book's. Content that does not fit scrolls inside `PageScroll`
 * (with a visible scroll bar and a "more below" cue), and the page bar stays pinned at the foot.
 */
function ContentPage({
  testID,
  nav,
  children,
}: {
  testID: string;
  nav?: PageNavInfo;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.page} testID={testID}>
      <Guilloche />
      <PageScroll>{children}</PageScroll>
      {nav ? <PageNav {...nav} /> : null}
    </View>
  );
}

/** Draws one page of the book. Stateless: the screen decides which page to hand it. */
export function PassportPage({
  page,
  nav,
  onOpenStamp,
  onSelectCountry,
  onOpenBadges,
}: PassportPageProps): React.JSX.Element {
  const styles = useStyles();
  switch (page.kind) {
    case 'cover':
      return (
        <View style={styles.coverPage} testID="passport-page-cover">
          <View style={styles.cover}>
            <Txt variant="eyebrow" color="gold" align="center" style={styles.embossSmall}>
              Wanderlift
            </Txt>
            <View style={styles.coverRule} />
            <Txt
              variant="display"
              color="gold"
              align="center"
              accessibilityLabel="Passport"
              style={styles.emboss}
            >
              PASSPORT
            </Txt>
            <View style={styles.coverRule} />
            <Txt variant="small" color="text2" align="center">
              Every place you have trained
            </Txt>
          </View>
          {nav ? <PageNav {...nav} /> : null}
        </View>
      );
    case 'bio':
      return (
        <ContentPage testID="passport-page-bio" nav={nav}>
          <Txt variant="eyebrow" color="text3">
            Traveller
          </Txt>
          <Bio label="Training since">
            {page.trainingSince ? formatFullLocalDate(page.trainingSince) : '-'}
          </Bio>
          <Bio label="Places">{String(page.placeCount)}</Bio>
          <Bio label="Countries">{String(page.countryCount)}</Bio>
          {page.first ? (
            <Bio label="First stamp">{`${page.first.label} - ${formatFullLocalDate(page.first.firstLocalDate)}`}</Bio>
          ) : null}
          {page.latest ? (
            <Bio label="Most recent stamp">{`${page.latest.label} - ${formatFullLocalDate(page.latest.lastLocalDate)}`}</Bio>
          ) : null}
        </ContentPage>
      );
    case 'contents':
      return (
        <ContentPage testID="passport-page-contents" nav={nav}>
          <Txt variant="eyebrow" color="text3" accessibilityRole="header">
            Contents
          </Txt>
          {page.groups.map((g) => (
            <PressableScale
              key={g.country}
              testID={`passport-country-${g.country}`}
              accessibilityRole="button"
              accessibilityLabel={`${g.country}, ${g.placeCount} ${plural(g.placeCount, 'place', 'places')}. Go to its pages`}
              onPress={() => onSelectCountry(g.country)}
              style={styles.contentsRow}
            >
              <Txt variant="bodyStrong" style={styles.flex}>
                {g.country}
              </Txt>
              <Txt variant="small" color="text2">
                {g.placeCount} {plural(g.placeCount, 'place', 'places')}
              </Txt>
            </PressableScale>
          ))}
        </ContentPage>
      );
    case 'visa':
      return (
        <View style={styles.page} testID={`passport-page-visa-${page.visaIndex}`}>
          <Guilloche />
          <VisaStamps entries={page.entries} onOpenStamp={onOpenStamp} />
          {nav ? <PageNav {...nav} /> : null}
        </View>
      );
    case 'endorsements':
      return (
        <ContentPage testID="passport-page-endorsements" nav={nav}>
          <Txt variant="eyebrow" color="text3" accessibilityRole="header">
            Endorsements
          </Txt>
          <View style={styles.badgeList}>
            {page.badges.map((b) => (
              <EndorsementRow key={b.def.id} badge={b} onPress={onOpenBadges} />
            ))}
          </View>
        </ContentPage>
      );
  }
}

/** Side space the book leaves around its pages (the screen's margin and the book's border). */
const BOOK_MARGIN = space.sm;

/**
 * The page's stamps, put down the way a person would: different shapes and sizes, anywhere on the
 * page, crooked, inked differently, and mostly clear of each other. Placement is `stampLayout`'s,
 * which fills the page it is given and never lets one stamp cover another's words. The date is
 * inside the stamp, as on a real one. The page is measured, so the stamps fit whatever height the
 * phone leaves; there is nothing to scroll.
 */
function VisaStamps({
  entries,
  onOpenStamp,
}: {
  entries: PassportEntry[];
  onOpenStamp: (entry: PassportEntry) => void;
}): React.JSX.Element {
  const styles = useStyles();
  const window = useWindowDimensions();
  // Until the page reports its size, a close guess, so a first frame (or a test) still has stamps.
  const [size, setSize] = useState({
    width: window.width - 2 * BOOK_MARGIN - 2,
    height: Math.round(window.height * 0.62),
  });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );
    }
  };
  const layout = useMemo(
    () =>
      stampLayout(
        entries.map((e) => e.label),
        size.width,
        size.height,
      ),
    [entries, size.width, size.height],
  );
  return (
    <View style={styles.flex} onLayout={onLayout} testID="passport-stamp-field">
      {entries.map((e, i) => {
        const slot = layout.slots[i]!;
        return (
          <PressableScale
            key={e.label}
            testID={`passport-stamp-${e.label}`}
            accessibilityRole="button"
            accessibilityLabel={`${e.label}, ${formatFullLocalDate(e.firstLocalDate)}. Show details`}
            onPress={() => onOpenStamp(e)}
            style={{
              position: 'absolute',
              left: slot.cx - slot.w / 2,
              top: slot.cy - slot.h / 2,
              width: slot.w,
              height: slot.h,
            }}
          >
            <Stamp
              testID={`passport-stamp-art-${e.label}`}
              title={e.label}
              subtitle={shortDate(e.firstLocalDate)}
              seed={e.label}
              shape={slot.shape}
              width={slot.w}
              height={slot.h}
              rotation={slot.rotation}
              opacity={slot.opacity}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * The page's scrolling body. A page that overflows says so: a scroll bar that stays on screen (iOS
 * hides its own after a moment) and a "More below" cue until the end is reached.
 */
function PageScroll({ children }: { children: React.ReactNode }): React.JSX.Element {
  const styles = useStyles();
  const ref = useRef<ScrollView>(null);
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [y, setY] = useState(0);
  const overflow = viewH > 0 && contentH > viewH + 1;
  const atEnd = y + viewH >= contentH - 4;

  useEffect(() => {
    if (overflow) ref.current?.flashScrollIndicators();
  }, [overflow]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setY(e.nativeEvent.contentOffset.y);
  const thumbH = overflow ? Math.max(32, (viewH / contentH) * viewH) : 0;
  const thumbTop = overflow
    ? (Math.min(y, contentH - viewH) / (contentH - viewH)) * (viewH - thumbH)
    : 0;

  return (
    <View
      style={styles.flex}
      onLayout={(e: LayoutChangeEvent) => setViewH(e.nativeEvent.layout.height)}
    >
      <ScrollView
        ref={ref}
        testID="passport-page-scroll"
        style={styles.flex}
        contentContainerStyle={styles.pageContent}
        onContentSizeChange={(_w, h) => setContentH(h)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {overflow ? (
        <>
          <View pointerEvents="none" style={styles.scrollTrack} testID="passport-scroll-track">
            <View style={[styles.scrollThumb, { height: thumbH, top: thumbTop }]} />
          </View>
          {!atEnd ? (
            <View pointerEvents="none" style={styles.moreCue} testID="passport-scroll-more">
              <Txt variant="caption" color="text2">
                More below
              </Txt>
              <Icon name="chevronDown" size={14} color="text2" />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/**
 * "Page N of M" with an arrow either side, at the foot of every page. For reference only: the book
 * turns by swiping, so the arrows are not buttons and just show which way there is more. A screen
 * reader still moves the page from the label (an `adjustable`).
 */
function PageNav({ index, count, onAdjust }: PageNavInfo): React.JSX.Element {
  const styles = useStyles();
  const hideFromReaders = {
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  } as const;
  const atStart = index <= 0;
  const atEnd = index >= count - 1;
  return (
    <View style={styles.nav}>
      <View
        testID="passport-prev"
        accessibilityState={{ disabled: atStart }}
        style={[styles.navArrow, atStart && styles.navArrowOff]}
        {...hideFromReaders}
      >
        <Icon name="back" size={18} color="text2" />
      </View>
      <Txt
        variant="small"
        color="text2"
        testID="passport-page-label"
        accessibilityLiveRegion="polite"
        accessibilityRole="adjustable"
        accessibilityActions={[
          { name: 'increment', label: 'Next page' },
          { name: 'decrement', label: 'Previous page' },
        ]}
        onAccessibilityAction={onAdjust}
      >
        Page {index + 1} of {count}
      </Txt>
      <View
        testID="passport-next"
        accessibilityState={{ disabled: atEnd }}
        style={[styles.navArrow, atEnd && styles.navArrowOff]}
        {...hideFromReaders}
      >
        <Icon name="chevronRight" size={18} color="text2" />
      </View>
    </View>
  );
}

function Bio({ label, children }: { label: string; children: string }): React.JSX.Element {
  return (
    <View accessible accessibilityLabel={`${label}: ${children}`}>
      <Txt variant="caption" color="text3">
        {label}
      </Txt>
      <Txt variant="bodyStrong">{children}</Txt>
    </View>
  );
}

function EndorsementRow({
  badge,
  onPress,
}: {
  badge: ShelfBadge;
  onPress: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const progress = badge.earned ? 'Earned' : badge.progress ? progressText(badge.progress) : '';
  return (
    <PressableScale
      testID={`passport-badge-${badge.def.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${badge.def.name}${progress ? `, ${progress}` : ''}. See all badges`}
      onPress={onPress}
      style={styles.badgeRow}
    >
      <BadgeEmblem badge={badge} size={40} />
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{badge.def.name}</Txt>
        {progress ? (
          <Txt variant="small" color="text2">
            {progress}
          </Txt>
        ) : null}
      </View>
    </PressableScale>
  );
}

interface PassportBookProps {
  pages: PassportBookPage[];
  index: number;
  onIndexChange: (i: number) => void;
  onOpenStamp: (entry: PassportEntry) => void;
  pageForCountry: (country: string) => number | null;
  onOpenBadges: () => void;
}

/** The book frame and the page turn. Swiping turns the pages; the page bar lives on each page. */
function PassportBook({
  pages,
  index,
  onIndexChange,
  onOpenStamp,
  pageForCountry,
  onOpenBadges,
}: PassportBookProps): React.JSX.Element {
  const styles = useStyles();
  const last = pages.length - 1;
  const pageTurn = usePageTurn({ index, last, onIndexChange });
  const { goTo } = pageTurn;
  // Screen readers adjust a single element, so the actions live on the "Page N of M" label (an
  // `adjustable`); the book itself must stay un-grouped so its stamps and rows remain reachable.
  const onAdjust = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') goTo(index + 1);
    else if (e.nativeEvent.actionName === 'decrement') goTo(index - 1);
  };
  return (
    <View
      style={styles.book}
      testID="passport-book"
      onLayout={pageTurn.onLayout}
      {...pageTurn.panHandlers}
    >
      <View style={styles.spine} />
      <PageTurnLayers
        index={index}
        pageTurn={pageTurn}
        renderPage={(i) => (
          <PassportPage
            page={pages[i]!}
            nav={{ index: i, count: pages.length, onAdjust }}
            onOpenStamp={onOpenStamp}
            onSelectCountry={(country) => {
              const t = pageForCountry(country);
              if (t !== null) goTo(t);
            }}
            onOpenBadges={onOpenBadges}
          />
        )}
      />
    </View>
  );
}

export default function PassportScreen({ navigation, route }: Props): React.JSX.Element {
  const styles = useStyles();
  const insets = useInsets();
  const { data, reload } = useDashboardData();
  // The hook does not load by itself: without this the screen stayed on its empty first render.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  const stampLabel = route.params?.stampLabel;
  // null until the user pages; then the start page (a stamp's page, else the cover) applies.
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // A new `stampLabel` while the screen is already open (Completion's link) drops the user's
  // paging so the new label's page shows at once: the page is drawn straight from `index`, and
  // only `goTo` runs a turn, so this is an instant jump.
  const [seenLabel, setSeenLabel] = useState(stampLabel);
  if (seenLabel !== stampLabel) {
    setSeenLabel(stampLabel);
    setPageIndex(null);
  }
  const [openEntry, setOpenEntry] = useState<PassportEntry | null>(null);

  const pages = useMemo(() => (data ? buildPassportBook(data.passport, data.badges) : []), [data]);

  if (!data) return <Screen testID="passport-screen" />;

  const startIndex = stampLabel ? (bookPageForLabel(data.passport, stampLabel) ?? 0) : 0;
  const last = Math.max(0, pages.length - 1);
  const index = Math.min(Math.max(pageIndex ?? startIndex, 0), last);

  const header = (
    <Txt variant="h1" accessibilityRole="header">
      Passport
    </Txt>
  );

  if (!data.user.passportEnabled) {
    return (
      <Screen scroll testID="passport-screen" contentStyle={styles.content}>
        {header}
        <PassportOptInCard testID="passport-opt-in-card" onEnabled={() => reload()} />
      </Screen>
    );
  }

  if (data.passport.places.length === 0) {
    return (
      <Screen scroll testID="passport-screen" contentStyle={styles.content}>
        {header}
        <EmptyState
          testID="passport-empty"
          icon="airplane"
          tone="sky"
          title="Passport is on"
          body="Train somewhere and your first stamp lands here."
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="passport-screen"
      padded={false}
      contentStyle={[styles.bookScreen, { paddingBottom: insets.bottom + BOOK_MARGIN }]}
    >
      <PassportBook
        pages={pages}
        index={index}
        onIndexChange={setPageIndex}
        onOpenStamp={setOpenEntry}
        pageForCountry={(country) => bookPageForCountry(data.passport, country)}
        onOpenBadges={() => navigation.navigate('Badges')}
      />

      <Sheet
        visible={openEntry !== null}
        onClose={() => setOpenEntry(null)}
        title={openEntry?.label}
        testID="passport-stamp-sheet"
      >
        {openEntry ? (
          <View style={styles.sheetBody}>
            <SheetRow label="First visit" value={formatFullLocalDate(openEntry.firstLocalDate)} />
            <SheetRow label="Last visit" value={formatFullLocalDate(openEntry.lastLocalDate)} />
            <SheetRow
              label="Workouts here"
              value={String(openEntry.sessionCount)}
              testID="passport-sheet-sessions"
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function SheetRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.sheetRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Txt variant="body" color="text2">
        {label}
      </Txt>
      <Txt variant="bodyStrong" testID={testID}>
        {value}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((theme) =>
  StyleSheet.create({
    content: { paddingTop: space.lg, paddingBottom: space.huge + space.xxl, gap: space.xl },
    /** The book takes whatever height the screen has left under the title. */
    bookScreen: { paddingTop: BOOK_MARGIN, paddingHorizontal: BOOK_MARGIN },
    flex: { flex: 1 },
    book: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.lineStrong,
      borderWidth: 1,
      borderRadius: radius.md,
      overflow: 'hidden',
      ...theme.elevation.card,
    },
    spine: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 8,
      backgroundColor: theme.colors.surface3,
    },
    coverPage: { flex: 1, backgroundColor: theme.colors.surface2 },
    cover: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xl,
      padding: space.xxl,
    },
    coverRule: { width: 120, height: 2, backgroundColor: theme.colors.gold, opacity: 0.6 },
    emboss: {
      textShadowColor: theme.colors.bg,
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 1,
    },
    embossSmall: {
      textShadowColor: theme.colors.bg,
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    page: { flex: 1 },
    pageContent: {
      paddingTop: space.xl,
      paddingBottom: space.lg,
      paddingLeft: space.xl + 8,
      paddingRight: space.xl + space.sm,
      gap: space.lg,
    },
    scrollTrack: {
      position: 'absolute',
      top: space.sm,
      bottom: space.sm,
      right: 4,
      width: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.line,
    },
    scrollThumb: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderRadius: 2,
      backgroundColor: theme.colors.text3,
    },
    moreCue: {
      position: 'absolute',
      bottom: space.sm,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      paddingVertical: space.xs,
      paddingHorizontal: space.md,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surface3,
      borderWidth: 1,
      borderColor: theme.colors.lineStrong,
    },
    contentsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.line,
    },
    stampGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
    stampCell: { width: '50%', alignItems: 'center', gap: space.xs, paddingVertical: space.xs },
    badgeList: { gap: space.lg },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space.md,
      paddingLeft: space.xl + 8,
      paddingRight: space.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.line,
    },
    navArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    navArrowOff: { opacity: 0.3 },
    sheetBody: { gap: space.md },
    sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  }),
);
