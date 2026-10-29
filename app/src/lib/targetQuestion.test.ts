import { targetLabel, targetQuestion } from './targetQuestion';

const reps = { sets: 3, repTarget: 10, durationSec: null, unilateral: false };

describe('targetQuestion', () => {
  it('names the prescription, not the logged sets', () => {
    expect(targetQuestion(reps, 'Banded Row')).toBe(
      'How was the target for Banded Row: 3 × 10 reps?',
    );
    expect(targetQuestion(reps)).toBe('How was the target: 3 × 10 reps?');
  });

  it('reads holds in seconds, per side when unilateral, and drops "1 ×" for a single set', () => {
    expect(targetLabel({ sets: 3, repTarget: null, durationSec: 30, unilateral: true })).toBe(
      '3 × 30s each side',
    );
    expect(targetLabel({ ...reps, sets: 1 })).toBe('10 reps');
    expect(targetLabel({ ...reps, sets: 1, repTarget: 1 })).toBe('1 rep');
  });

  it('falls back to a bare question with no target', () => {
    const none = { sets: 3, repTarget: null, durationSec: null, unilateral: false };
    expect(targetLabel(none)).toBeNull();
    expect(targetQuestion(none, 'Plank')).toBe('How was the target for Plank?');
  });
});
