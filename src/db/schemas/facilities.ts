import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { lodgesTable } from "./lodges";

export const facilitiesTable = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  description: varchar("description"),
  lodge_id: uuid("lodge_id")
    .references(() => lodgesTable.id)
    .notNull(),
  status: varchar("status", { enum: ["available", "unavailable"] }),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});
