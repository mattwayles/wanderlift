import { STARTING_POINTS } from '@roamfit/engine';
import { STARTING_POINT_OPTIONS, startingPointLabel } from './startingPoint';

describe('startingPoint copy', () => {
  it('has one option per starting point, in engine order, each with words', () => {
    expect(STARTING_POINT_OPTIONS.map((o) => o.id)).toEqual([...STARTING_POINTS]);
    for (const o of STARTING_POINT_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.description.length).toBeGreaterThan(0);
    }
    expect(startingPointLabel('restarting')).toBe("I haven't exercised in years");
    expect(startingPointLabel('regular')).toBe('I train regularly');
  });
});
