import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ProgressRing } from './ProgressRing';
import { Toast } from './Toast';

describe('VoiceOver on shared ui', () => {
  it('Toast announces its message directly (iOS ignores accessibilityLiveRegion)', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<Toast message="Strong set." triggerKey={1} />);
    expect(announce).toHaveBeenCalledWith('Strong set.');
  });

  it('ProgressRing speaks a text value when given one, a percentage otherwise', async () => {
    const { rerender } = await render(
      <ProgressRing progress={0.5} accessibilityValueText="42 seconds" testID="ring" />,
    );
    expect(screen.getByTestId('ring').props.accessibilityValue).toEqual({ text: '42 seconds' });
    await rerender(<ProgressRing progress={0.5} testID="ring" />);
    expect(screen.getByTestId('ring').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 50,
    });
  });
});
