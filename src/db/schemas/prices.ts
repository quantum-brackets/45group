import { pgTable, varchar, uuid, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { resourcesTable } from "./resources";
import { regionsTable } from "./regions";

export const pricesTable = pgTable("prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: numeric("amount").notNull(),
  currency_code: varchar("currency_code", { length: 3 }).notNull(),
  region_id: uuid("region_id")
    .references(() => regionsTable.id)
    .notNull(),
  resource_id: uuid("resource_id")
    .references(() => resourcesTable.id)
    .notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const pricesRelations = relations(pricesTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [pricesTable.resource_id],
    references: [resourcesTable.id],
  }),
  region: one(regionsTable, {
    fields: [pricesTable.region_id],
    references: [regionsTable.id],
  }),
}));
