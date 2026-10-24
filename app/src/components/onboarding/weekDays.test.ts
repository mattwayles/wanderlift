import { firstWeek, suggestedTrainingDays, weekdayIndex } from './weekDays';

describe('suggestedTrainingDays', () => {
  it('always starts today and spaces 1-4 sessions with rest between', () => {
    expect(suggestedTrainingDays('2026-10-24', 1)).toEqual(['2026-10-24']);
    expect(suggestedTrainingDays('2026-10-24', 2)).toEqual(['2026-10-24', '2026-10-27']);
    expect(suggestedTrainingDays('2026-10-24', 3)).toEqual([
      '2026-10-24',
      '2026-10-26',
      '2026-10-28',
    ]);
    expect(suggestedTrainingDays('2026-10-24', 4)).toEqual([
      '2026-10-24',
      '2026-10-26',
      '2026-10-28',
      '2026-10-29',
    ]);
  });

  it('crosses a month boundary', () => {
    expect(suggestedTrainingDays('2026-10-30', 3)).toEqual([
      '2026-10-30',
      '2026-11-01',
      '2026-11-03',
    ]);
  });

  it('crosses a year boundary and a leap day', () => {
    expect(suggestedTrainingDays('2026-12-30', 4)).toEqual([
      '2026-12-30',
      '2027-01-01',
      '2027-01-03',
      '2027-01-04',
    ]);
    expect(suggestedTrainingDays('2028-02-28', 3)).toEqual([
      '2028-02-28',
      '2028-03-01',
      '2028-03-03',
    ]);
  });

  it('clamps out-of-range counts', () => {
    expect(suggestedTrainingDays('2026-10-24', 0)).toHaveLength(1);
    expect(suggestedTrainingDays('2026-10-24', 9)).toHaveLength(4);
    expect(suggestedTrainingDays('2026-10-24', NaN)).toHaveLength(3);
  });
});

describe('weekdayIndex', () => {
  it('names calendar days without any timezone', () => {
    expect(weekdayIndex('2026-10-24')).toBe(6); // Saturday
    expect(weekdayIndex('2024-02-29')).toBe(4); // Thursday
    expect(weekdayIndex('2027-01-01')).toBe(5); // Friday
    expect(weekdayIndex('2000-01-02')).toBe(0); // Sunday
  });
});

describe('firstWeek', () => {
  it('is seven consecutive days across a year end, rest days included', () => {
    const w = firstWeek('2026-12-30', 3);
    expect(w.map((d) => d.date)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
      '2027-01-05',
    ]);
    expect(w.map((d) => d.isTraining)).toEqual([true, false, true, false, true, false, false]);
    expect(w[0].isToday).toBe(true);
    expect(w.filter((d) => d.isToday)).toHaveLength(1);
    expect(w[0].weekday).toBe('Wed');
    expect(w[2].dayOfMonth).toBe(1);
  });
});
