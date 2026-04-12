import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  usageCount: integer("usage_count").notNull().default(0),
});

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true, usageCount: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;
