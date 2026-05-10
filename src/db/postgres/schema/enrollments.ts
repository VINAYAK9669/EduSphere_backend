import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const enrollments = pgTable(
  'enrollments',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id').notNull(),
    classId: text('class_id').notNull(),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  },
  (t) => ({ uniq: unique().on(t.studentId, t.classId) })
);
