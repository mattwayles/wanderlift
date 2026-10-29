/**
 * The difficulty question, asked about the session's *target* rather than the sets as logged. A
 * user who logs the reps they really did has, by definition, done what they logged — so "how did
 * those sets feel" invites "just right" every time. The rating is the user's word on the
 * prescription (the engine eases or toughens the next one on it, whatever was logged), so the
 * question names the prescription: "How was the target for Banded Row: 3 × 10 reps?"
 */
interface TargetEntry {
  sets: number;
  repTarget: number | null;
  durationSec: number | null;
  unilateral: boolean;
}

/** "3 × 10 reps", "3 × 30s each side", "10 reps" for a single set; null with no target. */
export function targetLabel(entry: TargetEntry): string | null {
  const work =
    entry.repTarget != null
      ? `${entry.repTarget} ${entry.repTarget === 1 ? 'rep' : 'reps'}`
      : entry.durationSec != null
        ? `${entry.durationSec}s`
        : null;
  if (work == null) return null;
  const side = entry.unilateral ? ' each side' : '';
  return entry.sets > 1 ? `${entry.sets} × ${work}${side}` : `${work}${side}`;
}

/** The question; `exerciseName` is left out where the exercise is already the title. */
export function targetQuestion(entry: TargetEntry, exerciseName?: string): string {
  const label = targetLabel(entry);
  const subject = exerciseName ? `the target for ${exerciseName}` : 'the target';
  return label ? `How was ${subject}: ${label}?` : `How was ${subject}?`;
}
