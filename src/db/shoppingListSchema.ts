import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const shoppingList = sqliteTable('shopping_list', {
  weekStart: text('week_start').primaryKey(),
  items: text('items').notNull(),
  updatedAt: text('updated_at').notNull(),
});
