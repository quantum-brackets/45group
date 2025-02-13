import { InferSelectModel, relations } from "drizzle-orm";
import { timestamp, varchar, pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { Media, mediasTable } from "./media";
import { Resource, resourcesTable } from "./resources";

export const locationsTable = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 300 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    description: varchar("description"),
    updated_at: timestamp("updated_at"),
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    unique_name_state_city: unique("unique_name_state_city").on(
      table.name,
      table.state,
      table.city
    ),
  })
);

export const locationRelations = relations(locationsTable, ({ many }) => ({
  medias: many(mediasTable),
  resources: many(resourcesTable),
}));

export type Location = InferSelectModel<typeof locationsTable> & {
  medias?: Media[];
  resources?: Resource[];
};
