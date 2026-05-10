import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const institutions = pgTable('institutions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
