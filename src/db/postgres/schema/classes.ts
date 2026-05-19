import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { institutions } from './institutions';

export const classes = pgTable(
  'classes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    description: text('description'),
    teacherId: text('teacher_id')
      .notNull()
      .references(() => users.id),
    institutionId: text('institution_id')
      .notNull()
      .references(() => institutions.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    teacherIdx: index('classes_teacher_id_idx').on(t.teacherId),
    institutionIdx: index('classes_institution_id_idx').on(t.institutionId),
  })
);
