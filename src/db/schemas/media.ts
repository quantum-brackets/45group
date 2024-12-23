import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar, jsonb, integer } from "drizzle-orm/pg-core";
import { locationsTable } from "./locations";
import { usersTable } from "./users";
import { resourcesTable } from "./resources";

export const mediasTable = pgTable("medias", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: varchar("url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
  user_id: uuid("user_id").references(() => usersTable.id),
  location_id: uuid("location_id").references(() => locationsTable.id),
  resource_id: uuid("resource_id").references(() => resourcesTable.id),
});

export const mediaRelations = relations(mediasTable, ({ one }) => ({
  location: one(locationsTable, {
    fields: [mediasTable.location_id],
    references: [locationsTable.id],
  }),
  user: one(usersTable, {
    fields: [mediasTable.user_id],
    references: [usersTable.id],
  }),
  resource: one(resourcesTable, {
    fields: [mediasTable.resource_id],
    references: [resourcesTable.id],
  }),
}));
