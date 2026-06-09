import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const batchCooking = sqliteTable('batch_cooking', {
  weekStart: text('week_start').primaryKey(),
  instructions: text('instructions').notNull(),
  updatedAt: text('updated_at').notNull(),
});
