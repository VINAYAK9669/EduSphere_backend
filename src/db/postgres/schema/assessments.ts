import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const assessments = pgTable('assessments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  classId: text('class_id').notNull(),
  competencyId: text('competency_id').notNull(),
  score: integer('score').notNull(),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
