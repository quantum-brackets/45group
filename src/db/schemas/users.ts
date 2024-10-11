import { boolean, json, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 320 }).unique().notNull(),
  phone: varchar("phone", { length: 256 }).unique(),
  is_verified: boolean("is_verified").default(false),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
  metadata: json("metadata"),
});
