import {
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DB_NAME = 'health.db';

let _sqlite: SQLiteDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function ensureConnection() {
  if (!_sqlite || !_db) {
    _sqlite = openDatabaseSync(DB_NAME);
    _db = drizzle(_sqlite, { schema });
  }
  return { sqlite: _sqlite, db: _db };
}

export function getDb() {
  return ensureConnection().db;
}

export function getSqlite(): SQLiteDatabase {
  return ensureConnection().sqlite;
}

export async function closeDatabase() {
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
