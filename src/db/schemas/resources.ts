import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  primaryKey,
  time,
  uniqueIndex,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rulesTable } from "./rules";
import { mediasTable } from "./media";
import { facilitiesTable } from "./facilities";
import { locationsTable } from "./locations";
import { groupsTable } from "./groups";

export const resourcesTable = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 300 }).notNull(),
    type: varchar("type", { enum: ["lodge", "event", "dining"] }).notNull(),
    description: varchar("description").notNull(),
    status: varchar("status", { enum: ["draft", "published", "archived", "inactive"] }).default(
      "draft"
    ),
    location_id: uuid("location_id")
      .references(() => locationsTable.id)
      .notNull(),
    schedule_type: varchar("schedule_type", {
      enum: ["24/7", "custom", "weekdays", "weekends"],
    }).notNull(),
    thumbnail: varchar("thumbnail").notNull(),
    updated_at: timestamp("updated_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    unique_resource: uniqueIndex("unique_resource").on(t.name, t.type),
  })
);

export const resourceRulesTable = pgTable(
  "resource_rules",
  {
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id, { onDelete: "cascade" })
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

export const resourceFacilitiesTable = pgTable(
  "resource_facilities",
  {
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id, { onDelete: "cascade" })
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

export const resourceGroupsTable = pgTable(
  "resource_groups",
  {
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id, { onDelete: "cascade" })
      .notNull(),
    group_id: uuid("group_id")
      .references(() => groupsTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.resource_id, t.group_id] }),
  })
);

export const resourceSchedulesTable = pgTable(
  "resource_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resource_id: uuid("resource_id")
      .references(() => resourcesTable.id, { onDelete: "cascade" })
      .notNull(),
    start_time: time("start_time").notNull(),
    end_time: time("end_time").notNull(),
    day_of_week: varchar("day_of_week", {
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    }).notNull(),
  },
  (t) => ({
    unique_day_of_week: uniqueIndex("unique_day_of_week").on(t.resource_id, t.day_of_week),
  })
);

export const resourceBlocksTable = pgTable("resource_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  resource_id: uuid("resource_id")
    .references(() => resourcesTable.id, { onDelete: "cascade" })
    .notNull(),
  reason: text("reason"),
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  block_type: varchar("block_type", {
    enum: ["holiday", "maintenance", "booked"],
  }).notNull(),
  recurring: varchar("recurring", {
    enum: ["weekly", "monthly", "yearly"],
  }),
});

export const resourceRelations = relations(resourcesTable, ({ many, one }) => ({
  images: many(mediasTable),
  location: one(locationsTable, {
    fields: [resourcesTable.location_id],
    references: [locationsTable.id],
  }),
  rules: many(resourceRulesTable),
  facilities: many(resourceFacilitiesTable),
  schedules: many(resourceSchedulesTable),
}));

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

export const resourceGroupsRelations = relations(resourceGroupsTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [resourceGroupsTable.resource_id],
    references: [resourcesTable.id],
  }),
  group: one(facilitiesTable, {
    fields: [resourceGroupsTable.group_id],
    references: [facilitiesTable.id],
  }),
}));

export const resourceSchedulesRelations = relations(resourceSchedulesTable, ({ one }) => ({
  resource: one(resourcesTable, {
    fields: [resourceSchedulesTable.resource_id],
    references: [resourcesTable.id],
  }),
}));
