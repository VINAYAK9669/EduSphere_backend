import { pgTable, text, timestamp, pgEnum, integer, index } from 'drizzle-orm/pg-core';
import { classes } from './classes';
import { users } from './users';

export const noteStatusEnum = pgEnum('note_status', ['processing', 'ready', 'error']);

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    r2Key: text('r2_key').notNull().unique(),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    status: noteStatusEnum('status').notNull().default('processing'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    classIdx: index('notes_class_id_idx').on(t.classId),
    uploadedByIdx: index('notes_uploaded_by_idx').on(t.uploadedBy),
  })
);
