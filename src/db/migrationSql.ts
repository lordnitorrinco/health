export const MIGRATION_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  muscle_group TEXT
);

CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS routine_exercises_routine_idx ON routine_exercises(routine_id);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS schedule_date_idx ON schedule(date);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES routines(id),
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  logged_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sets_session_idx ON sets(session_id);
CREATE INDEX IF NOT EXISTS sets_exercise_logged_idx ON sets(exercise_id, logged_at);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,
  description TEXT NOT NULL,
  calories INTEGER,
  time TEXT
);
CREATE INDEX IF NOT EXISTS meals_date_slot_idx ON meals(date, slot);

CREATE TABLE IF NOT EXISTS intake_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  logged_at TEXT NOT NULL,
  description TEXT NOT NULL,
  calories INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS intake_log_logged_at_idx ON intake_log(logged_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recorded_at TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  body_fat_pct REAL,
  water_pct REAL,
  muscle_pct REAL
);
CREATE INDEX IF NOT EXISTS body_metrics_recorded_at_idx ON body_metrics(recorded_at);

CREATE TABLE IF NOT EXISTS daily_steps (
  date TEXT PRIMARY KEY,
  steps INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_steps_date_idx ON daily_steps(date);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS supplements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dose TEXT,
  schedule TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplement_intake (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplement_id INTEGER NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  taken_at TEXT NOT NULL,
  dose TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS supplement_intake_supp_idx ON supplement_intake(supplement_id);
CREATE INDEX IF NOT EXISTS supplement_intake_taken_idx ON supplement_intake(taken_at);

CREATE TABLE IF NOT EXISTS batch_cooking (
  week_start TEXT PRIMARY KEY,
  instructions TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// Migraciones de columnas para BBDD ya existentes. SQLite no soporta
// "ADD COLUMN IF NOT EXISTS", así que cada sentencia se ejecuta por separado
// y se ignora el error si la columna ya existe.
export const COLUMN_MIGRATIONS = [
  'ALTER TABLE meals ADD COLUMN time TEXT;',
];
