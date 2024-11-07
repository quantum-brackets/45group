import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const otpsTable = pgTable("otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_email: varchar("user_email")
    .references(() => usersTable.email)
    .notNull(),
  hashed_otp: varchar("hashed_otp", { length: 64 }).notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
