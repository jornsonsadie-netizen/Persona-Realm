import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiModelsTable = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  displayName: text("display_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiModelSchema = createInsertSchema(aiModelsTable).omit({ id: true, createdAt: true });
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModelsTable.$inferSelect;
