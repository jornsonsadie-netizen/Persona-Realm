import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatsTable = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  characterId: integer("character_id").notNull(),
  personaId: integer("persona_id").notNull(),
  systemPrompt: text("system_prompt"),
  modelId: integer("model_id"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  role: text("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  modelUsed: text("model_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chatsTable).omit({ id: true, lastMessageAt: true, createdAt: true });
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chatsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
