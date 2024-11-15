import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lodgesTable } from "./lodges";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => usersTable.id)
    .notNull(),
  resource_id: uuid("resource_id")
    .references(() => lodgesTable.id)
    .notNull(),
  check_in_date: timestamp("check_in_date"),
  check_out_date: timestamp("check_out_date"),
  status: varchar("status", { enum: ["pending", "confirmed", "cancelled"] }),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const bookingsRelations = relations(bookingsTable, ({ one }) => ({
  resource: one(lodgesTable, {
    fields: [bookingsTable.resource_id],
    references: [lodgesTable.id],
  }),
  user: one(usersTable, {
    fields: [bookingsTable.user_id],
    references: [usersTable.id],
  }),
}));
