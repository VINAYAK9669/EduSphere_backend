import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const competencies = pgTable('competencies', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  weight: integer('weight').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
