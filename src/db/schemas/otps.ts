import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const otps = pgTable("otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_email: varchar("user_email").references(() => users.email),
  hashed_otp: varchar("hashed_otp", { length: 64 }),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
