/** Under React 19 the commit is asynchronous; every render is followed by an awaited query. */
import React from 'react';
import { Share, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AppErrorBoundary from './AppErrorBoundary';
import { recentErrors, resetErrorCaptureForTests } from '../lib/errorCapture';

const WAIT_OPTS: Parameters<typeof waitFor>[1] = { timeout: 5000, interval: 50 };

let failuresLeft = 0;
function Flaky() {
  if (failuresLeft > 0) {
    failuresLeft -= 1;
    throw new Error('kaboom');
  }
  return <Text>all good</Text>;
}

async function findByText(t: string | RegExp) {
  await waitFor(() => expect(screen.getByText(t)).toBeTruthy(), WAIT_OPTS);
  return screen.getByText(t);
}
async function findByLabelText(t: string) {
  await waitFor(() => expect(screen.getByLabelText(t)).toBeTruthy(), WAIT_OPTS);
  return screen.getByLabelText(t);
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    resetErrorCaptureForTests();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders the calm fallback when a child throws', async () => {
    failuresLeft = 99;
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    expect(await findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText(/safe on this device/)).toBeTruthy();
    expect(screen.getByLabelText('Try again')).toBeTruthy();
    expect(screen.getByLabelText('Share error details')).toBeTruthy();
    await waitFor(() => expect(recentErrors()[0]?.message).toBe('kaboom'), WAIT_OPTS);
  });

  it('Try again re-renders the children', async () => {
    // React retries a failed render once before giving up, so two throws reach the boundary.
    failuresLeft = 2;
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    fireEvent.press(await findByLabelText('Try again'));
    expect(await findByText('all good')).toBeTruthy();
  });

  it('Share error details shares text containing the error message', async () => {
    failuresLeft = 99;
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'dismissedAction' });
    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    fireEvent.press(await findByLabelText('Share error details'));
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].message).toContain('kaboom');
  });
});
