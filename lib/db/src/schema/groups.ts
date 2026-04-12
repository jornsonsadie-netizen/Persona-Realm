import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const groupChatsTable = pgTable("group_chats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  memberType: text("member_type").notNull(), // "character" | "persona" | "user"
  characterId: integer("character_id"),
  personaId: integer("persona_id"),
  userId: text("user_id"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMessagesTable = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  senderType: text("sender_type").notNull(), // "character" | "user"
  senderId: integer("sender_id"), // character or persona id
  senderUserId: text("sender_user_id"),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  modelUsed: text("model_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupInvitesTable = pgTable("group_invites", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  inviterPersonaId: integer("inviter_persona_id").notNull(),
  inviteePersonaId: integer("invitee_persona_id").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroupChatSchema = createInsertSchema(groupChatsTable).omit({ id: true, createdAt: true });
export type InsertGroupChat = z.infer<typeof insertGroupChatSchema>;
export type GroupChat = typeof groupChatsTable.$inferSelect;

export const insertGroupMemberSchema = createInsertSchema(groupMembersTable).omit({ id: true, joinedAt: true });
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembersTable.$inferSelect;
