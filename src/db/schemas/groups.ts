import { InferSelectModel } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type ResourceGroup = InferSelectModel<typeof groupsTable>;
