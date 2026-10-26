import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HowToDemo from './HowToDemo';
import { useIsOnline } from '../lib/networkStatus';

jest.mock('../lib/networkStatus', () => ({ useIsOnline: jest.fn() }));

describe('HowToDemo', () => {
  it('offline, hides the YouTube search and keeps only the note', async () => {
    (useIsOnline as jest.Mock).mockReturnValue(false);
    await render(<HowToDemo exerciseName="Push-up" />);
    expect(screen.getByTestId('how-to-demo-note')).toBeTruthy();
    expect(screen.getByText('Short video demos are on the way.')).toBeTruthy();
    expect(screen.queryByTestId('how-to-video-link')).toBeNull();
  });

  it('online, offers the working demo search with the note under it', async () => {
    (useIsOnline as jest.Mock).mockReturnValue(true);
    await render(<HowToDemo exerciseName="Push-up" />);
    expect(screen.getByTestId('how-to-video-link')).toBeTruthy();
    expect(screen.getByTestId('how-to-demo-note')).toBeTruthy();
  });

  it('never renders placeholder wording', async () => {
    (useIsOnline as jest.Mock).mockReturnValue(true);
    await render(<HowToDemo exerciseName="Push-up" />);
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.queryByTestId('how-to-demo-soon')).toBeNull();
  });
});
