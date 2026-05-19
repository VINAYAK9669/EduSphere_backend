import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { classes } from './classes';

export const sessionStatusEnum = pgEnum('session_status', ['upcoming', 'live', 'ended']);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: sessionStatusEnum('status').notNull().default('upcoming'),
    scheduledAt: timestamp('scheduled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    classIdx: index('sessions_class_id_idx').on(t.classId),
  })
);
