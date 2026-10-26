/**
 * "Export my data" and "Delete all data". Both cover every per-user table (invariant 7: nothing
 * per-user lives on the shared exercise library, which is not in SQLite at all) and neither
 * touches `_migrations`, so a wiped database is still a current-schema database.
 */
import type { Db } from '../db';
import { schema } from '../db';

/** Every per-user table, by its SQL name. A table added to the schema without an entry here is
 *  caught by the test that compares this list with the schema's own exports. */
const USER_TABLES = {
  users: schema.users,
  limitations: schema.limitations,
  exercise_state: schema.exerciseState,
  progression_state: schema.progressionState,
  manual_day_markers: schema.manualDayMarkers,
  sessions: schema.sessions,
  session_entries: schema.sessionEntries,
  set_logs: schema.setLogs,
  signal_events: schema.signalEvents,
  milestones: schema.milestones,
  earned_badges: schema.earnedBadges,
  rolled_up_stats: schema.rolledUpStats,
  deferred_work: schema.deferredWork,
  session_muscle_volume: schema.sessionMuscleVolume,
} as const;

export const USER_TABLE_NAMES = Object.keys(USER_TABLES) as (keyof typeof USER_TABLES)[];

export interface UserDataExport {
  app: 'wanderlift';
  /** Bumped if the shape below ever changes. */
  format: 1;
  exportedAt: string;
  /** Every row of every per-user table, as stored (column names as in the schema's fields). */
  tables: Record<string, unknown[]>;
}

/** Everything the app holds about the user, as plain JSON-able rows. Read-only. */
export function exportAllUserData(db: Db, now: string): UserDataExport {
  const tables: Record<string, unknown[]> = {};
  for (const name of USER_TABLE_NAMES) tables[name] = db.select().from(USER_TABLES[name]).all();
  return { app: 'wanderlift', format: 1, exportedAt: now, tables };
}

/** Deletes every row of every per-user table in one transaction: all or nothing. The next
 *  `usersRepo.ensureUser` recreates a fresh user, so the app starts again from first run. */
export function deleteAllUserData(db: Db): void {
  db.transaction((tx) => {
    for (const name of USER_TABLE_NAMES) tx.delete(USER_TABLES[name]).run();
  });
}
