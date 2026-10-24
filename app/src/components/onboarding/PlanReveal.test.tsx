/**
 * Track 51b — PlanReveal. Renders are async under React 19; each case awaits `ready(...)` first.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { daybreak, midnight } from '../../theme';
import { flat, inDaybreak, ready } from '../../ui/test-utils';
import { PlanReveal } from './PlanReveal';

const TRAILS = [
  { trailName: 'Push', exerciseName: 'Incline push-up' },
  { trailName: 'Pull', exerciseName: 'Band row' },
  { trailName: 'Legs', exerciseName: 'Box squat' },
];

const base = {
  trails: TRAILS,
  sessionsThisWeek: 3,
  goalLabel: 'General fitness',
  today: '2026-10-24',
};

describe('PlanReveal', () => {
  it('shows the goal and each trail’s starting move', async () => {
    render(<PlanReveal {...base} onStart={jest.fn()} onLater={jest.fn()} />);
    await ready('plan-reveal');
    expect(screen.getByTestId('plan-goal')).toHaveTextContent('Goal: General fitness');
    for (const t of TRAILS) {
      expect(screen.getByText(t.trailName)).toBeTruthy();
      expect(screen.getByText(t.exerciseName)).toBeTruthy();
    }
  });

  it('draws seven days with rest days labelled as rest', async () => {
    render(<PlanReveal {...base} onStart={jest.fn()} onLater={jest.fn()} />);
    await ready('plan-week');
    expect(screen.getByTestId('plan-day-2026-10-24').props.accessibilityLabel).toBe(
      'Today 24, workout',
    );
    expect(screen.getByTestId('plan-day-2026-10-25').props.accessibilityLabel).toBe('Sun 25, rest');
    expect(screen.getByTestId('plan-day-2026-10-30')).toBeTruthy();
    expect(screen.getAllByText('Rest')).toHaveLength(4);
  });

  it('calls onStart from the primary button', async () => {
    const onStart = jest.fn();
    const onLater = jest.fn();
    render(<PlanReveal {...base} onStart={onStart} onLater={onLater} />);
    await ready('plan-start');
    fireEvent.press(screen.getByTestId('plan-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
  });

  it('calls onLater from "Look around first"', async () => {
    const onStart = jest.fn();
    const onLater = jest.fn();
    render(<PlanReveal {...base} onStart={onStart} onLater={onLater} />);
    await ready('plan-later');
    fireEvent.press(screen.getByTestId('plan-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('paints in Midnight', async () => {
    render(<PlanReveal {...base} onStart={jest.fn()} onLater={jest.fn()} />);
    await ready('plan-day-2026-10-24');
    expect(flat('plan-day-2026-10-24').backgroundColor).toBe(midnight.teal);
  });

  it('paints in Daybreak', async () => {
    render(inDaybreak(<PlanReveal {...base} onStart={jest.fn()} onLater={jest.fn()} />));
    await ready('plan-day-2026-10-24');
    expect(flat('plan-day-2026-10-24').backgroundColor).toBe(daybreak.teal);
  });
});
