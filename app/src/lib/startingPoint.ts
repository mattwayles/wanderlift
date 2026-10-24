/**
 * Track 51a — copy for onboarding's "Where are you starting?". Plain data so the picker and the
 * tests read the same words. The mapping to ladder rungs lives in the engine
 * (`startingLevelFor`); nothing here knows about levels. No option is a ranking or a judgement
 * (invariant 4): each is a plain description of where someone is today.
 */
import { STARTING_POINTS } from '@roamfit/engine';
import type { StartingPoint } from '@roamfit/engine';

export interface StartingPointOption {
  id: StartingPoint;
  label: string;
  description: string;
}

const COPY: Record<StartingPoint, Omit<StartingPointOption, 'id'>> = {
  restarting: {
    label: "I haven't exercised in years",
    description: 'Start at the very beginning and build up gently.',
  },
  occasional: {
    label: 'I move now and then',
    description: 'A walk, a stretch, the odd workout. Start a little way up each ladder.',
  },
  active: {
    label: 'I work out sometimes',
    description: 'Exercise is part of most weeks. Start partway up each ladder.',
  },
  regular: {
    label: 'I train regularly',
    description: 'Training is a habit. Start about halfway up each ladder, with room to climb.',
  },
};

/** Weakest to strongest, the order the picker shows them. */
export const STARTING_POINT_OPTIONS: readonly StartingPointOption[] = STARTING_POINTS.map((id) => ({
  id,
  ...COPY[id],
}));

export function startingPointLabel(point: StartingPoint): string {
  return COPY[point].label;
}
