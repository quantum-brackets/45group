import { relations } from "drizzle-orm";
import { timestamp, varchar, pgTable, uuid } from "drizzle-orm/pg-core";
import { mediasTable } from "./media";
import { resourcesTable } from "./resources";

export const locationsTable = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  description: varchar("description"),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const locationRelations = relations(locationsTable, ({ many }) => ({
  images: many(mediasTable),
  resources: many(resourcesTable),
}));
