import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const supplements = sqliteTable('supplements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  dose: text('dose'),
  schedule: text('schedule'),
  notes: text('notes'),
  active: integer('active').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const supplementIntake = sqliteTable(
  'supplement_intake',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    supplementId: integer('supplement_id')
      .notNull()
      .references(() => supplements.id, { onDelete: 'cascade' }),
    takenAt: text('taken_at').notNull(),
    dose: text('dose'),
    notes: text('notes'),
  },
  (t) => [
    index('supplement_intake_supp_idx').on(t.supplementId),
    index('supplement_intake_taken_idx').on(t.takenAt),
  ]
);
