import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { lodgesTable } from "./lodges";

export const mediasTable = pgTable("medias", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: varchar("url").notNull(),
  type: varchar("type", { enum: ["image", "video", "document"] }).notNull(),
  file_type: varchar("file_type").notNull(),
  resource_id: uuid("resource_id")
    .references(() => lodgesTable.id)
    .notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

export const mediasRelations = relations(mediasTable, ({ one }) => ({
  resource: one(lodgesTable, {
    fields: [mediasTable.resource_id],
    references: [lodgesTable.id],
  }),
}));
