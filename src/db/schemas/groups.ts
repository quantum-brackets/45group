import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  num: integer("num").notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});
