import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  teacherId: text('teacher_id').notNull(),
  institutionId: text('institution_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
