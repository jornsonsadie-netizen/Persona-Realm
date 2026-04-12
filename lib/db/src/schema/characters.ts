import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  personality: text("personality").notNull(),
  description: text("description").notNull(),
  profilePicture: text("profile_picture"),
  backgroundStory: text("background_story").notNull(),
  lore: text("lore").notNull(),
  introMessage: text("intro_message").notNull(),
  tags: text("tags").array().notNull().default([]),
  chatCount: integer("chat_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, chatCount: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
