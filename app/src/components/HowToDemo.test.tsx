import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HowToDemo from './HowToDemo';
import { useIsOnline } from '../lib/networkStatus';

jest.mock('../lib/networkStatus', () => ({ useIsOnline: jest.fn() }));

describe('HowToDemo', () => {
  it('promises a demo and hides the YouTube search while offline', async () => {
    (useIsOnline as jest.Mock).mockReturnValue(false);
    await render(<HowToDemo exerciseName="Push-up" />);
    expect(screen.getByTestId('how-to-demo-soon')).toBeTruthy();
    expect(screen.getByText('Video demo coming soon')).toBeTruthy();
    expect(screen.queryByText('In the meantime')).toBeNull();
    expect(screen.queryByTestId('how-to-video-link')).toBeNull();
  });

  it('online, keeps the promise and offers the search in the meantime', async () => {
    (useIsOnline as jest.Mock).mockReturnValue(true);
    await render(<HowToDemo exerciseName="Push-up" />);
    expect(screen.getByTestId('how-to-demo-soon')).toBeTruthy();
    expect(screen.getByText('In the meantime')).toBeTruthy();
    expect(screen.getByTestId('how-to-video-link')).toBeTruthy();
  });
});
