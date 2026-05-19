import { pgTable, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { classes } from './classes';

export const enrollments = pgTable(
  'enrollments',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.studentId, t.classId),
    studentIdx: index('enrollments_student_id_idx').on(t.studentId),
    classIdx: index('enrollments_class_id_idx').on(t.classId),
  })
);
