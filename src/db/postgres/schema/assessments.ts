import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { classes } from './classes';
import { competencies } from './competencies';

export const assessments = pgTable(
  'assessments',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id')
      .notNull()
      .references(() => users.id),
    assessorId: text('assessor_id')
      .notNull()
      .references(() => users.id),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id),
    competencyId: text('competency_id')
      .notNull()
      .references(() => competencies.id),
    score: integer('score').notNull(),
    feedback: text('feedback'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    studentIdx: index('assessments_student_id_idx').on(t.studentId),
    classIdx: index('assessments_class_id_idx').on(t.classId),
    competencyIdx: index('assessments_competency_id_idx').on(t.competencyId),
  })
);
