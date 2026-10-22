import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { exerciseLibrary } from '@roamfit/data';
import { MuscleMap, MUSCLE_MAP_ASPECT } from './MuscleMap';

const exercise = exerciseLibrary.exercises[0]!;

describe('MuscleMap', () => {
  it('is decorative by default and sized from its height', async () => {
    await render(<MuscleMap exercise={exercise} height={52} accent="teal" testID="m" />);
    expect(screen.queryByTestId('m')).toBeNull();
    const svg = screen.getByTestId('m', { hidden: true });
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.height).toBe(52);
    expect(svg.props.width).toBe(Math.round(52 * MUSCLE_MAP_ASPECT));
  });

  it('is exposed when it carries a label', async () => {
    await render(
      <MuscleMap exercise={exercise} height={52} accent="teal" accessibilityLabel="Works chest" />,
    );
    expect(screen.getByLabelText('Works chest')).toBeTruthy();
  });

  it('zoomed, is a square cropped to the worked muscles', async () => {
    await render(<MuscleMap exercise={exercise} height={46} accent="teal" zoom testID="z" />);
    const svg = screen.getByTestId('z', { hidden: true });
    expect(svg.props.width).toBe(46);
    expect(svg.props.height).toBe(46);
    expect(svg.props.vbWidth).toBe(svg.props.vbHeight);
    expect(svg.props.vbWidth).toBeLessThanOrEqual(1448);
  });

  it('can force the other side', async () => {
    await render(
      <MuscleMap exercise={exercise} height={52} accent="teal" side="back" testID="b" />,
    );
    const x = screen.getByTestId('b', { hidden: true }).props.minX;
    expect(x).toBeGreaterThanOrEqual(724);
  });
});
