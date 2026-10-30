import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HeartRateBadge } from './HeartRateBadge';

describe('HeartRateBadge', () => {
  it('shows the number with a spoken label', async () => {
    await render(<HeartRateBadge bpm={142} />);
    expect(screen.getByLabelText('Heart rate 142 beats per minute')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain('"142"');
  });

  it('renders nothing without a reading: no placeholder, no empty slot', async () => {
    await render(<HeartRateBadge bpm={null} />);
    expect(screen.queryByTestId('heart-rate')).toBeNull();
    expect(screen.toJSON()).toBeNull();
  });
});
