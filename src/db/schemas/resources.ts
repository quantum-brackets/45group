import { pgTable, timestamp, uuid, varchar, numeric, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rulesTable } from "./rules";
import { mediasTable } from "./media";
import { facilitiesTable } from "./facilities";

export const resourcesTable = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  location: varchar("location", { length: 300 }).notNull(),
  type: varchar("type", { enum: ["lodge", "event", "restaurant"] }).notNull(),
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

export const resourceRelations = relations(resourcesTable, ({ many }) => ({
  images: many(mediasTable),
}));

export const resourceRulesTable = pgTable(
  "resource_rules",
  {
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id)
      .notNull(),
    rule_id: uuid("rule_id")
      .references(() => rulesTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.resource_id, t.rule_id] }),
  })
);

export const resourceRulesRelations = relations(resourceRulesTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [resourceRulesTable.resource_id],
    references: [resourcesTable.id],
  }),
  rule: one(rulesTable, {
    fields: [resourceRulesTable.rule_id],
    references: [rulesTable.id],
  }),
}));

export const resourceFacilitiesTable = pgTable(
  "resource_facilities",
  {
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id)
      .notNull(),
    facility_id: uuid("facility_id")
      .references(() => facilitiesTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.resource_id, t.facility_id] }),
  })
);

export const resourceFacilitiesRelations = relations(resourceFacilitiesTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [resourceFacilitiesTable.resource_id],
    references: [resourcesTable.id],
  }),
  facility: one(facilitiesTable, {
    fields: [resourceFacilitiesTable.facility_id],
    references: [facilitiesTable.id],
  }),
}));
