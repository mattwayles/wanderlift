/**
 * Track 39b - the Passport book screen: pages, paging buttons, the stamp-label deep link, the stamp
 * sheet, the contents jump, the endorsement tap-through, the opt-in, and both themes. The dashboard
 * read is mocked with real page-model inputs (the model itself is covered in passportBook.test.ts).
 */
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StoreProvider } from '../state/StoreContext';
import { ThemeProvider } from '../state/ThemeProvider';
import type { RootStackParamList } from '../navigation/types';
import { buildBadgeShelf } from '../lib/badges';
import { emptyBadgeFacts } from '../lib/badges.fixtures';
import { buildPassportSummary } from '../lib/dashboard';
import { manyPlaces, sessionAt } from '../lib/passportBook.fixtures';
import { useDashboardData } from '../lib/useDashboardData';
import PassportScreen from './PassportScreen';

jest.mock('../lib/useDashboardData', () => ({ useDashboardData: jest.fn() }));
const mockUseDashboardData = useDashboardData as jest.Mock;

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };
const Stack = createNativeStackNavigator<RootStackParamList>();
const reload = jest.fn();
let navRef = createNavigationContainerRef<RootStackParamList>();

function BadgesStub(): React.JSX.Element {
  return <Text testID="badges-stub">badges</Text>;
}

function setData(opts: { enabled?: boolean; sessions?: ReturnType<typeof manyPlaces> } = {}) {
  const enabled = opts.enabled ?? true;
  const sessions = opts.sessions ?? [
    ...manyPlaces(7, 'Portugal', 'PT'),
    sessionAt('2026-03-01', 'Cusco', 'Peru', 'PE'),
  ];
  mockUseDashboardData.mockReturnValue({
    data: {
      user: { passportEnabled: enabled },
      passport: buildPassportSummary(enabled ? sessions : []),
      badges: buildBadgeShelf(
        [],
        emptyBadgeFacts({ passportEnabled: enabled, citiesVisited: 2, countriesVisited: 1 }),
      ),
    },
    reload,
  });
}

function mount(params?: RootStackParamList['Passport'], theme?: 'light' | 'dark') {
  navRef = createNavigationContainerRef<RootStackParamList>();
  const tree = (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator>
        <Stack.Screen name="Passport" component={PassportScreen} initialParams={params} />
        <Stack.Screen name="Badges" component={BadgesStub} />
      </Stack.Navigator>
    </NavigationContainer>
  );
  return render(
    <StoreProvider>
      {theme ? <ThemeProvider initialPreference={theme}>{tree}</ThemeProvider> : tree}
    </StoreProvider>,
  );
}

/** Presses are ignored mid-turn, so wait for the page-turn overlay to go before the next input. */
const settle = () =>
  waitFor(
    () => expect(screen.queryByTestId('passport-turn', { includeHiddenElements: true })).toBeNull(),
    WAIT_OPTS,
  );
/** Pages by the label's screen-reader actions: the arrows are reference only (the book swipes). */
const pageAction = (actionName: 'increment' | 'decrement') =>
  fireEvent(screen.getByTestId('passport-page-label'), 'accessibilityAction', {
    nativeEvent: { actionName },
  });
const nextPage = () => pageAction('increment');
const prevPage = () => pageAction('decrement');
const pageLabel = () => screen.getByTestId('passport-page-label').props.children.join('');

describe('PassportScreen', () => {
  beforeEach(() => {
    reload.mockClear();
    setData();
  });

  it('opens on the cover, titled with a header', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
    expect(screen.getByText('PASSPORT')).toBeTruthy();
    expect(screen.getByText('Wanderlift')).toBeTruthy();
    expect(screen.getByText('Passport').props.accessibilityRole).toBe('header');
    expect(pageLabel()).toBe('Page 1 of 6');
  });

  it('pages forward and back, with the reference arrows dimmed at the ends', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
    expect(
      screen.getByTestId('passport-prev', { includeHiddenElements: true }).props.accessibilityState
        ?.disabled,
    ).toBe(true);

    await nextPage();
    await settle();
    expect(screen.getByTestId('passport-page-bio')).toBeTruthy();
    expect(pageLabel()).toBe('Page 2 of 6');
    expect(screen.getByText('Training since')).toBeTruthy();
    expect(screen.getByText('Thursday, January 1, 2026')).toBeTruthy();

    await prevPage();
    await settle();
    expect(screen.getByTestId('passport-page-cover')).toBeTruthy();

    for (let i = 0; i < 5; i += 1) {
      await nextPage();
      await settle();
    }
    expect(screen.getByTestId('passport-page-endorsements')).toBeTruthy();
    expect(pageLabel()).toBe('Page 6 of 6');
    expect(
      screen.getByTestId('passport-next', { includeHiddenElements: true }).props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('a page that overflows shows a scroll bar and a More below cue until the end; the arrows are not buttons', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
    await nextPage();
    await settle();
    // Nothing overflows until the page is measured.
    expect(screen.queryByTestId('passport-scroll-more')).toBeNull();
    const scroll = screen.getByTestId('passport-page-scroll');
    await act(async () => {
      scroll.parent!.props.onLayout({ nativeEvent: { layout: { height: 300 } } });
      scroll.props.onContentSizeChange(300, 900);
    });
    expect(screen.getByTestId('passport-scroll-track')).toBeTruthy();
    expect(screen.getByText('More below')).toBeTruthy();
    await act(async () => {
      scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 600 } } });
    });
    expect(screen.queryByTestId('passport-scroll-more')).toBeNull();
    // Reference only: no press handler on either arrow.
    for (const id of ['passport-prev', 'passport-next']) {
      const arrow = screen.getByTestId(id, { includeHiddenElements: true });
      expect(arrow.props.onPress).toBeUndefined();
      expect(arrow.props.onClick).toBeUndefined();
    }
  });

  it('opens at the stamp page named by stampLabel', async () => {
    mount({ stampLabel: 'Cusco, PER' });
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-1')).toBeTruthy(), WAIT_OPTS);
    expect(pageLabel()).toBe('Page 5 of 6');
    expect(screen.getByTestId('passport-stamp-Cusco, PER')).toBeTruthy();
  });

  it('a new stampLabel while open jumps straight to that stamp page, with no turn', async () => {
    mount({ stampLabel: 'City01, PRT' });
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-0')).toBeTruthy(), WAIT_OPTS);
    // The user pages away first, so their own paging is what the new label has to override.
    await nextPage();
    await settle();
    expect(pageLabel()).toBe('Page 5 of 6');

    await act(async () => navRef.navigate('Passport', { stampLabel: 'Cusco, PER' }));
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-1')).toBeTruthy(), WAIT_OPTS);
    expect(screen.queryByTestId('passport-turn', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('passport-stamp-Cusco, PER')).toBeTruthy();
    expect(pageLabel()).toBe('Page 5 of 6');

    // Back to an earlier label: the page follows, still without a turn.
    await act(async () => navRef.navigate('Passport', { stampLabel: 'City01, PRT' }));
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-0')).toBeTruthy(), WAIT_OPTS);
    expect(screen.queryByTestId('passport-turn', { includeHiddenElements: true })).toBeNull();
  });

  it('an unknown stampLabel falls back to the cover', async () => {
    mount({ stampLabel: 'Nowhere' });
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
  });

  it('shows six stamps with dates per visa page; tapping one opens its detail sheet', async () => {
    mount({ stampLabel: 'City01, PRT' });
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-0')).toBeTruthy(), WAIT_OPTS);
    expect(screen.getAllByTestId(/^passport-stamp-City/)).toHaveLength(6 * 1);
    expect(screen.getByText('Jan 1, 2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('passport-stamp-City02, PRT'));
    await waitFor(
      () => expect(screen.getByTestId('passport-sheet-sessions')).toBeTruthy(),
      WAIT_OPTS,
    );
    expect(screen.getByTestId('passport-sheet-sessions').props.children).toBe('1');
    expect(screen.getByText('First visit')).toBeTruthy();
    expect(screen.getByText('Last visit')).toBeTruthy();
  });

  it('a contents row jumps to that country’s first visa page', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
    await nextPage();
    await settle();
    await nextPage();
    await settle();
    expect(screen.getByTestId('passport-page-contents')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('passport-country-Peru'));
    await settle();
    expect(screen.getByTestId('passport-page-visa-1')).toBeTruthy();
    expect(pageLabel()).toBe('Page 5 of 6');
  });

  it('an endorsement opens the Badges screen', async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-page-cover')).toBeTruthy(), WAIT_OPTS);
    for (let i = 0; i < 5; i += 1) {
      await nextPage();
      await settle();
    }
    expect(screen.getByText('Three Stops')).toBeTruthy();
    expect(screen.getByText('2 of 3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('passport-badge-cities_3'));
    await waitFor(() => expect(screen.getByTestId('badges-stub')).toBeTruthy(), WAIT_OPTS);
  });

  it('loads its data when it opens (the hook does not load by itself)', async () => {
    mount();
    await waitFor(() => expect(reload).toHaveBeenCalled(), WAIT_OPTS);
  });

  it('with Passport off, shows the opt-in instead of the book', async () => {
    setData({ enabled: false });
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-opt-in')).toBeTruthy(), WAIT_OPTS);
    expect(screen.queryByTestId('passport-book')).toBeNull();
    reload.mockClear(); // the load on open; the opt-in's own reload is what is checked below
    await fireEvent.press(screen.getByTestId('passport-opt-in'));
    expect(reload).toHaveBeenCalled();
  });

  it('with Passport on and no places, shows a gentle empty state', async () => {
    setData({ sessions: [] });
    mount();
    await waitFor(() => expect(screen.getByTestId('passport-empty')).toBeTruthy(), WAIT_OPTS);
    expect(screen.getByText('Passport is on')).toBeTruthy();
    expect(screen.queryByTestId('passport-book')).toBeNull();
  });

  it.each(['dark', 'light'] as const)('renders the book under the %s theme', async (theme) => {
    mount({ stampLabel: 'City01, PRT' }, theme);
    await waitFor(() => expect(screen.getByTestId('passport-page-visa-0')).toBeTruthy(), WAIT_OPTS);
    expect(screen.getByTestId('passport-book')).toBeTruthy();
  });
});
