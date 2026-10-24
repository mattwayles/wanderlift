import { shouldAskForReview, type ReviewPromptInputs } from './reviewPrompt';

const base: ReviewPromptInputs = {
  completedWorkouts: 3,
  levelledUp: false,
  lastAskedLocalDate: null,
  lastAskedVersion: null,
  currentVersion: '1.0.0',
  todayLocalDate: '2026-10-23',
};
const ask = (o: Partial<ReviewPromptInputs>) => shouldAskForReview({ ...base, ...o });

describe('shouldAskForReview', () => {
  it('asks on the 3rd completed workout', () => {
    expect(ask({ completedWorkouts: 3 })).toBe(true);
  });

  it('does not ask on the 2nd workout', () => {
    expect(ask({ completedWorkouts: 2 })).toBe(false);
  });

  it('asks on a level-up even on the 1st workout', () => {
    expect(ask({ completedWorkouts: 1, levelledUp: true })).toBe(true);
  });

  it('does not ask twice in the same app version', () => {
    expect(
      ask({ lastAskedVersion: '1.0.0', lastAskedLocalDate: '2025-01-01', currentVersion: '1.0.0' }),
    ).toBe(false);
  });

  it('does not ask within 120 days of the last ask, even on a new version', () => {
    // 2026-06-25 -> 2026-10-23 is exactly 120 days; a day later in June is 119.
    expect(ask({ lastAskedVersion: '0.9.0', lastAskedLocalDate: '2026-06-26' })).toBe(false);
  });

  it('asks again once 120 days have passed on a new version', () => {
    expect(ask({ lastAskedVersion: '0.9.0', lastAskedLocalDate: '2026-06-25' })).toBe(true);
  });

  it('counts days across a month and year boundary', () => {
    const lastAskedVersion = '0.9.0';
    const lastAskedLocalDate = '2025-12-31';
    // 2025-12-31 -> 2026-04-30 is 120 days.
    expect(ask({ lastAskedVersion, lastAskedLocalDate, todayLocalDate: '2026-04-29' })).toBe(false);
    expect(ask({ lastAskedVersion, lastAskedLocalDate, todayLocalDate: '2026-04-30' })).toBe(true);
    // 121 days.
    expect(ask({ lastAskedVersion, lastAskedLocalDate, todayLocalDate: '2026-05-01' })).toBe(true);
  });
});
