/**
 * Track 51b — ValueScreens. Under React 19 `render` commits asynchronously, so each case awaits
 * `ready(...)` before touching `screen` (same convention as the other component tests).
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { midnight, daybreak } from '../../theme';
import { WAIT, flat, inDaybreak, ready } from '../../ui/test-utils';
import { VALUE_PANELS, ValueScreens } from './ValueScreens';

describe('ValueScreens', () => {
  it('shows all three panels and "Next" until the last one', async () => {
    render(<ValueScreens onDone={jest.fn()} />);
    await ready('value-screens');
    for (let i = 0; i < 3; i++) expect(screen.getByTestId(`value-panel-${i}`)).toBeTruthy();
    expect(screen.getByText(VALUE_PANELS[0].title)).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('advances through all three and calls onDone on the last button', async () => {
    const onDone = jest.fn();
    render(<ValueScreens onDone={onDone} />);
    await ready('value-next');
    fireEvent.press(screen.getByTestId('value-next'));
    await waitFor(
      () => expect(screen.getByTestId('value-next').props.accessibilityHint).toMatch(/panel 3/),
      WAIT,
    );
    fireEvent.press(screen.getByTestId('value-next'));
    await waitFor(() => expect(screen.getByText('Get started')).toBeTruthy(), WAIT);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('value-next'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('follows a swipe with the dots', async () => {
    render(<ValueScreens onDone={jest.fn()} />);
    await ready('value-pager');
    const w = Dimensions.get('window').width;
    fireEvent(screen.getByTestId('value-pager'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: w * 2, y: 0 } },
    });
    await waitFor(() => expect(screen.getByText('Get started')).toBeTruthy(), WAIT);
    const dotWidth = (i: number) =>
      StyleSheet.flatten(screen.getByTestId(`value-dot-${i}`, { hidden: true }).props.style).width;
    expect(dotWidth(2)).toBeGreaterThan(dotWidth(0));
  });

  it('calls onDone from Skip', async () => {
    const onDone = jest.fn();
    render(<ValueScreens onDone={onDone} />);
    await ready('value-skip');
    fireEvent.press(screen.getByTestId('value-skip'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the dots out of the accessibility tree', async () => {
    render(<ValueScreens onDone={jest.fn()} />);
    await ready('value-pager');
    expect(
      screen.getByTestId('value-dots', { hidden: true }).props.accessibilityElementsHidden,
    ).toBe(true);
  });

  it('paints in Midnight', async () => {
    render(<ValueScreens onDone={jest.fn()} />);
    await ready('value-screens');
    expect(flat('value-screens').backgroundColor).toBe(midnight.bg);
  });

  it('paints in Daybreak', async () => {
    render(inDaybreak(<ValueScreens onDone={jest.fn()} />));
    await ready('value-screens');
    expect(flat('value-screens').backgroundColor).toBe(daybreak.bg);
  });
});
