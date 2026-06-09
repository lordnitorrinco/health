import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group'),
});

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [index('routine_exercises_routine_idx').on(t.routineId)]
);

export const schedule = sqliteTable(
  'schedule',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
  },
  (t) => [index('schedule_date_idx').on(t.date)]
);

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  routineId: integer('routine_id')
    .notNull()
    .references(() => routines.id),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
});

export const sets = sqliteTable(
  'sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    weightKg: real('weight_kg').notNull(),
    reps: integer('reps').notNull(),
    loggedAt: text('logged_at').notNull(),
  },
  (t) => [
    index('sets_session_idx').on(t.sessionId),
    index('sets_exercise_logged_idx').on(t.exerciseId, t.loggedAt),
  ]
);

export const meals = sqliteTable(
  'meals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    slot: text('slot').notNull(),
    description: text('description').notNull(),
    calories: integer('calories'),
  },
  (t) => [index('meals_date_slot_idx').on(t.date, t.slot)]
);

export const intakeLog = sqliteTable(
  'intake_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    loggedAt: text('logged_at').notNull(),
    description: text('description').notNull(),
    calories: integer('calories').notNull(),
  },
  (t) => [index('intake_log_logged_at_idx').on(t.loggedAt)]
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const bodyMetrics = sqliteTable(
  'body_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recordedAt: text('recorded_at').notNull(),
    weightKg: real('weight_kg').notNull(),
    bodyFatPct: real('body_fat_pct'),
    waterPct: real('water_pct'),
    musclePct: real('muscle_pct'),
  },
  (t) => [index('body_metrics_recorded_at_idx').on(t.recordedAt)]
);

export type MealSlot =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner';

export const MEAL_SLOTS: MealSlot[] = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
];

export { dailySteps } from './dailyStepsSchema';
