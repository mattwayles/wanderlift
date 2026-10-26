import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { schema } from '../db';
import { createTestDb } from '../testHarness';
import { enqueueDeferredWork } from './queues';
import { ensureUser, getUser, updateUser } from './users';
import { USER_TABLE_NAMES, deleteAllUserData, exportAllUserData } from './userData';

const T0 = '2026-09-01T10:00:00.000Z';

function seed() {
  const { db } = createTestDb();
  ensureUser(db, T0);
  updateUser(db, { healthWriteEnabled: true }, T0);
  enqueueDeferredWork(db, 'healthkit_write', 'session-1', { a: 1 }, T0);
  return db;
}

describe('user data export and delete', () => {
  it('covers every table in the schema except the migration ledger', () => {
    const inSchema = (Object.values(schema) as unknown[])
      .filter((t): t is SQLiteTable => is(t, SQLiteTable))
      .map((t) => getTableName(t))
      .filter((n) => n !== '_migrations')
      .sort();
    expect([...USER_TABLE_NAMES].sort()).toEqual(inSchema);
  });

  it('exports every row, stamped with the time and format', () => {
    const db = seed();
    const out = exportAllUserData(db, T0);
    expect(out).toMatchObject({ app: 'wanderlift', format: 1, exportedAt: T0 });
    expect(Object.keys(out.tables).sort()).toEqual([...USER_TABLE_NAMES].sort());
    expect(out.tables.users).toHaveLength(1);
    expect(out.tables.deferred_work).toHaveLength(1);
    expect(() => JSON.stringify(out)).not.toThrow();
  });

  it('deletes every per-user row, and a fresh user can be created afterwards', () => {
    const db = seed();
    deleteAllUserData(db);
    const out = exportAllUserData(db, T0);
    for (const name of USER_TABLE_NAMES) expect(out.tables[name]).toEqual([]);
    expect(getUser(db)).toBeNull();
    expect(ensureUser(db, T0).healthWriteEnabled).toBe(false);
  });
});
