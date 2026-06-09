import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const dailySteps = sqliteTable(
  'daily_steps',
  {
    date: text('date').primaryKey(),
    steps: integer('steps').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('daily_steps_date_idx').on(t.date)]
);
