/**
 * Track 51b — NotificationPrimer. Renders are async under React 19; each case awaits `ready(...)`.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { WAIT, inDaybreak, ready } from '../../ui/test-utils';
import { NotificationPrimer } from './NotificationPrimer';

describe('NotificationPrimer', () => {
  it('passes the default time to onEnable without touching permissions', async () => {
    const onEnable = jest.fn();
    const spy = jest.spyOn(Notifications, 'requestPermissionsAsync');
    render(<NotificationPrimer defaultTime="18:30" onEnable={onEnable} onSkip={jest.fn()} />);
    await ready('primer-enable');
    fireEvent.press(screen.getByTestId('primer-enable'));
    expect(onEnable).toHaveBeenCalledWith('18:30');
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes the time the user picked', async () => {
    const onEnable = jest.fn();
    render(<NotificationPrimer defaultTime="18:30" onEnable={onEnable} onSkip={jest.fn()} />);
    await ready('primer-time-picker');
    const picked = new Date();
    picked.setHours(7, 45, 0, 0);
    fireEvent(screen.getByTestId('primer-time-picker'), 'change', {
      nativeEvent: { timestamp: picked.getTime() },
    });
    await waitFor(
      () => expect(screen.getByTestId('primer-time-picker').props.date).toBe(picked.getTime()),
      WAIT,
    );
    fireEvent.press(screen.getByTestId('primer-enable'));
    expect(onEnable).toHaveBeenCalledWith('07:45');
  });

  it('calls onSkip from "Not now"', async () => {
    const onEnable = jest.fn();
    const onSkip = jest.fn();
    render(<NotificationPrimer defaultTime="18:30" onEnable={onEnable} onSkip={onSkip} />);
    await ready('primer-skip');
    fireEvent.press(screen.getByTestId('primer-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('renders in Daybreak too', async () => {
    render(
      inDaybreak(
        <NotificationPrimer defaultTime="09:00" onEnable={jest.fn()} onSkip={jest.fn()} />,
      ),
    );
    await ready('notification-primer');
    expect(screen.getByText('Turn on reminders')).toBeTruthy();
  });
});
