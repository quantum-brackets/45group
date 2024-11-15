import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rulesTable = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  description: varchar("description"),
  category: varchar("category", { enum: ["House Rules", "Cancellations"] }),
  updated_at: timestamp("updated_at"),
  created_at: timestamp("created_at").defaultNow(),
});
