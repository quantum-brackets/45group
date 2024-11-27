import { boolean, json, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  first_name: varchar("first_name", { length: 100 }),
  last_name: varchar("last_name", { length: 100 }),
  image: varchar("image"),
  type: varchar("type", { enum: ["user", "admin"] }).default("user"),
  email: varchar("email", { length: 320 }).unique().notNull(),
  phone: varchar("phone", { length: 256 }).unique(),
  is_verified: boolean("is_verified").default(false),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
  last_login_at: timestamp("last_login_at"),
  complete_profile: boolean("complete_profile").default(false),
  metadata: json("metadata"),
});
