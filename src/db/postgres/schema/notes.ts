import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const noteStatusEnum = pgEnum('note_status', ['processing', 'ready', 'error']);

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  classId: text('class_id').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  title: text('title').notNull(),
  r2Key: text('r2_key').notNull(),
  status: noteStatusEnum('status').notNull().default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
