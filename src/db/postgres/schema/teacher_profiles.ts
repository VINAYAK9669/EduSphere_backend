import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const teacherProfiles = pgTable('teacher_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  experienceYears: integer('experience_years'),
  qualifications: text('qualifications').array(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
