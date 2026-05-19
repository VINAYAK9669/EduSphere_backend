import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const institutions = pgTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  about: text("about"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  country: text("country").notNull(),
  domainSlug: text("domain_slug").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
