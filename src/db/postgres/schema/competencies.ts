import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { classes } from './classes';

export const competencies = pgTable(
  'competencies',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    weight: integer('weight').default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    classIdx: index('competencies_class_id_idx').on(t.classId),
  })
);
