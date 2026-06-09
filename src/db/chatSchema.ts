import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('chat_messages_created_idx').on(t.createdAt)]
);
