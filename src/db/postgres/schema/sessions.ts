import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  title: text('title').notNull(),
  scheduledAt: timestamp('scheduled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
