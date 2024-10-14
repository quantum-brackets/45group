import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const blacklistedTokenTable = pgTable("blacklisted_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  blacklisted_at: timestamp("blacklisted_at").notNull(),
});
