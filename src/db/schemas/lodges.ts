import { pgTable, timestamp, uuid, varchar, numeric, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rulesTable } from "./rules";
import { mediasTable } from "./media";
import { facilitiesTable } from "./facilities";

export const lodgesTable = pgTable("lodges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  location: varchar("location", { length: 300 }).notNull(),
  description: varchar("description").notNull(),
  status: varchar("status", { enum: ["draft", "published", "archived", "inactive"] }).default(
    "draft"
  ),
  thumbnail: varchar("thumbnail").notNull(),
  rating: numeric("rating"),
  address: varchar("address"),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const lodgesRelations = relations(lodgesTable, ({ many }) => ({
  images: many(mediasTable),
}));

export const lodgesRulesTable = pgTable(
  "lodges_rules",
  {
    lodge_id: uuid("lodge_id")
      .references(() => lodgesTable.id)
      .notNull(),
    rule_id: uuid("rule_id")
      .references(() => rulesTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lodge_id, t.rule_id] }),
  })
);

export const lodgesRulesRelations = relations(lodgesRulesTable, ({ one }) => ({
  lodge: one(lodgesTable, {
    fields: [lodgesRulesTable.lodge_id],
    references: [lodgesTable.id],
  }),
  rule: one(rulesTable, {
    fields: [lodgesRulesTable.rule_id],
    references: [rulesTable.id],
  }),
}));

export const lodgesFacilitiesTable = pgTable(
  "lodges_facilities",
  {
    lodge_id: uuid("lodge_id")
      .references(() => lodgesTable.id)
      .notNull(),
    facility_id: uuid("facility_id")
      .references(() => rulesTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lodge_id, t.facility_id] }),
  })
);

export const lodgesFacilitiesRelations = relations(lodgesFacilitiesTable, ({ one }) => ({
  lodge: one(lodgesTable, {
    fields: [lodgesFacilitiesTable.lodge_id],
    references: [lodgesTable.id],
  }),
  facility: one(facilitiesTable, {
    fields: [lodgesFacilitiesTable.facility_id],
    references: [facilitiesTable.id],
  }),
}));
