import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lodgesTable } from "./lodges";

export const availabilityTable = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  description: varchar("description"),
  resource_id: uuid("resource_id")
    .references(() => lodgesTable.id)
    .notNull(),
  status: varchar("status", { enum: ["available", "unavailable"] }),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const availabilityRelations = relations(availabilityTable, ({ one }) => ({
  resource: one(lodgesTable, {
    fields: [availabilityTable.resource_id],
    references: [lodgesTable.id],
  }),
}));
