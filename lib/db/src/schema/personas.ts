import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const personasTable = pgTable("personas", {
  id: serial("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  personality: text("personality").notNull(),
  description: text("description").notNull(),
  lore: text("lore").notNull(),
  tags: text("tags").array().notNull().default([]),
  isMain: boolean("is_main").notNull().default(false),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPersonaSchema = createInsertSchema(personasTable).omit({ id: true, isMain: true, createdAt: true });
export type InsertPersona = z.infer<typeof insertPersonaSchema>;
export type Persona = typeof personasTable.$inferSelect;
