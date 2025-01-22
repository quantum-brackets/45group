import { InferSelectModel } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rulesTable = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  description: varchar("description"),
  category: varchar("category", { enum: ["house_rules", "cancellations"] }).notNull(),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export type ResourceRule = InferSelectModel<typeof rulesTable>;
