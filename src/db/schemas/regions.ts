import { relations } from "drizzle-orm";
import { pgTable, varchar, uuid, timestamp } from "drizzle-orm/pg-core";
import { pricesTable } from "./prices";

export const regionsTable = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  currency_code: varchar("currency_code").notNull(),
  deleted_at: timestamp("deleted_at"),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const regionsRelations = relations(regionsTable, ({ many }) => ({
  prices: many(pricesTable),
}));
