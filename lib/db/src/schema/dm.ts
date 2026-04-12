import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dmMessagesTable = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  fromPersonaId: integer("from_persona_id").notNull(),
  toPersonaId: integer("to_persona_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDmMessageSchema = createInsertSchema(dmMessagesTable).omit({ id: true, read: true, createdAt: true });
export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type DmMessage = typeof dmMessagesTable.$inferSelect;
