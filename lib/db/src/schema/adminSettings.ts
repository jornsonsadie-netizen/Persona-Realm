import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  aiProviderName: text("ai_provider_name").notNull().default("NVIDIA"),
  aiProviderEndpoint: text("ai_provider_endpoint").notNull().default("https://integrate.api.nvidia.com/v1"),
  aiProviderApiKey: text("ai_provider_api_key"),
  maxContextSize: integer("max_context_size").notNull().default(20000),
  contextSummarizationThreshold: integer("context_summarization_threshold").notNull().default(20000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettingsTable).omit({ id: true });
export type InsertAdminSettings = z.infer<typeof insertAdminSettingsSchema>;
export type AdminSettings = typeof adminSettingsTable.$inferSelect;
