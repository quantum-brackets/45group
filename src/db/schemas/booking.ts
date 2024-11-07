import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { lodgesTable } from "./lodges";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => usersTable.id)
    .notNull(),
  lodge_id: uuid("lodge_id")
    .references(() => lodgesTable.id)
    .notNull(),
  check_in_date: timestamp("check_in_date"),
  check_out_date: timestamp("check_out_date"),
  status: varchar("status", { enum: ["pending", "confirmed", "cancelled"] }),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});
