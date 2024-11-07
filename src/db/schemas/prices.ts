import { pgTable, varchar, uuid, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lodgesTable } from "./lodges";
import { regionsTable } from "./regions";

export const pricesTable = pgTable("prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: numeric("amount"),
  currency_code: varchar("currency_code"),
  region_id: uuid("region_id")
    .references(() => regionsTable.id)
    .notNull(),
  lodge_id: uuid("lodge_id")
    .references(() => lodgesTable.id)
    .notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const pricesRelations = relations(pricesTable, ({ one }) => ({
  lodge: one(lodgesTable, {
    fields: [pricesTable.lodge_id],
    references: [lodgesTable.id],
  }),
  region: one(regionsTable, {
    fields: [pricesTable.region_id],
    references: [regionsTable.id],
  }),
}));
