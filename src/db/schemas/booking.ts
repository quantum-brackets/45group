import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { resourcesTable } from "./resources";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => usersTable.id)
    .notNull(),
  resource_id: uuid("resource_id")
    .references(() => resourcesTable.id)
    .notNull(),
  check_in_date: timestamp("check_in_date").notNull(),
  check_out_date: timestamp("check_out_date").notNull(),
  status: varchar("status", { enum: ["pending", "confirmed", "cancelled"] }).notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const bookingsRelations = relations(bookingsTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [bookingsTable.resource_id],
    references: [resourcesTable.id],
  }),
  user: one(usersTable, {
    fields: [bookingsTable.user_id],
    references: [usersTable.id],
  }),
}));
