import {
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { MIGRATION_SQL } from './migrationSql';
import * as schema from './schema';

export const DB_NAME = 'health.db';

let _sqlite: SQLiteDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let dbQueue: Promise<void> = Promise.resolve();
let dbTaskDepth = 0;

function openConnection() {
  const sqlite = openDatabaseSync(DB_NAME);
  sqlite.execSync(MIGRATION_SQL);
  return sqlite;
}

function ensureConnection() {
  if (!_sqlite || !_db) {
    _sqlite = openConnection();
    _db = drizzle(_sqlite, { schema });
  }
  return { sqlite: _sqlite, db: _db };
}

/** Abre la BD (una sola conexión nativa) y aplica migraciones. */
export function initDatabase(): void {
  ensureConnection();
}

export function getDb() {
  return ensureConnection().db;
}

export function getSqlite(): SQLiteDatabase {
  return ensureConnection().sqlite;
}

/** Serializa accesos async; reentrante para evitar deadlock tool → stepCount. */
export function runWithDb<T>(fn: () => T | Promise<T>): Promise<T> {
  if (dbTaskDepth > 0) {
    return Promise.resolve().then(fn);
  }

  const task = dbQueue.then(async () => {
    dbTaskDepth++;
    try {
      return await fn();
    } finally {
      dbTaskDepth--;
    }
  }, async () => {
    dbTaskDepth++;
    try {
      return await fn();
    } finally {
      dbTaskDepth--;
    }
  });

  dbQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export async function closeDatabase() {
  await dbQueue;
  if (_sqlite) {
    await _sqlite.closeAsync();
    _sqlite = null;
    _db = null;
  }
}

export function resetDatabaseConnection() {
  _sqlite = null;
  _db = null;
}

export { schema };
