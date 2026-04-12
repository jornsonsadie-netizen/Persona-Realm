import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, chatsTable, messagesTable, charactersTable, personasTable, aiModelsTable, adminSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { runCsamFilter, callMainModel, callCheapModelWithFallback, summarizeHistory, estimateTokenCount, type ChatMessage } from "../lib/nvidiaGateway";
import { logger } from "../lib/logger";

const router = Router();

async function getCharacterWithData(characterId: number) {
  const [char] = await db.select().from(charactersTable).where(eq(charactersTable.id, characterId));
  return char;
}

async function getPersonaWithData(personaId: number) {
  const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, personaId));
  return persona;
}

// GET /chats
router.get("/chats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const chats = await db.select().from(chatsTable).where(eq(chatsTable.userId, userId)).orderBy(desc(chatsTable.lastMessageAt));
  const enriched = await Promise.all(chats.map(async (chat) => {
    const [character] = await db.select().from(charactersTable).where(eq(charactersTable.id, chat.characterId));
    const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, chat.personaId));
    return { ...chat, character, persona };
  }));
  res.json(enriched);
});

// POST /chats
router.post("/chats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { characterId, personaId, modelId, systemPrompt } = req.body;
  if (!characterId || !personaId) {
    res.status(400).json({ error: "characterId and personaId are required" });
    return;
  }
  const character = await getCharacterWithData(Number(characterId));
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  const persona = await getPersonaWithData(Number(personaId));
  if (!persona) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }

  const [chat] = await db.insert(chatsTable).values({
    userId,
    characterId: Number(characterId),
    personaId: Number(personaId),
    modelId: modelId ? Number(modelId) : null,
    systemPrompt: systemPrompt || null,
  }).returning();

  // insert intro message as assistant
  if (character.introMessage) {
    await db.insert(messagesTable).values({
      chatId: chat.id,
      role: "assistant",
      content: character.introMessage,
      modelUsed: null,
    });
  }

  // increment chat count
  await db.update(charactersTable).set({ chatCount: sql`${charactersTable.chatCount} + 1` }).where(eq(charactersTable.id, character.id));

  res.status(201).json({ ...chat, character, persona });
});

// GET /chats/:id
router.get("/chats/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  const [character, persona, messages] = await Promise.all([
    db.select().from(charactersTable).where(eq(charactersTable.id, chat.characterId)).then(r => r[0]),
    db.select().from(personasTable).where(eq(personasTable.id, chat.personaId)).then(r => r[0]),
    db.select().from(messagesTable).where(eq(messagesTable.chatId, chat.id)).orderBy(messagesTable.createdAt),
  ]);
  res.json({ ...chat, character, persona, messages });
});

// PATCH /chats/:id
router.patch("/chats/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { systemPrompt, modelId } = req.body;
  const [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  const updates: Partial<typeof chatsTable.$inferInsert> = {};
  if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
  if (modelId !== undefined) updates.modelId = modelId ? Number(modelId) : null;
  const [updated] = await db.update(chatsTable).set(updates).where(eq(chatsTable.id, id)).returning();
  res.json(updated);
});

// DELETE /chats/:id
router.delete("/chats/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.chatId, id));
  await db.delete(chatsTable).where(eq(chatsTable.id, id));
  res.sendStatus(204);
});

// POST /chats/:id/messages
router.post("/chats/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { content, modelId: requestModelId } = req.body;

  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const [character, persona] = await Promise.all([
    db.select().from(charactersTable).where(eq(charactersTable.id, chat.characterId)).then(r => r[0]),
    db.select().from(personasTable).where(eq(personasTable.id, chat.personaId)).then(r => r[0]),
  ]);

  // CSAM filter check
  const csamResult = await runCsamFilter(content, character?.age);
  if (!csamResult.safe) {
    const [userMsg] = await db.insert(messagesTable).values({ chatId: id, role: "user", content }).returning();
    const rejectionContent = `[CONTENT BLOCKED]\n\n${csamResult.reason}`;
    const [assistantMsg] = await db.insert(messagesTable).values({ chatId: id, role: "assistant", content: rejectionContent, modelUsed: "safety-filter" }).returning();
    await db.update(chatsTable).set({ lastMessageAt: new Date() }).where(eq(chatsTable.id, id));
    res.json({ userMessage: userMsg, assistantMessage: assistantMsg, modelUsed: "safety-filter", blocked: true, blockReason: csamResult.reason });
    return;
  }

  // Get settings
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const maxTokens = settings?.maxContextSize || 20000;
  const sumThreshold = settings?.contextSummarizationThreshold || 20000;

  // Determine model to use
  const modelIdToUse = requestModelId || chat.modelId;
  let modelApiId: string | null = null;
  let providerEndpoint = settings?.aiProviderEndpoint || "https://integrate.api.nvidia.com/v1";
  let providerApiKey = settings?.aiProviderApiKey || process.env.NVIDIA_API_KEY || null;

  if (modelIdToUse) {
    const [m] = await db.select().from(aiModelsTable).where(and(eq(aiModelsTable.id, Number(modelIdToUse)), eq(aiModelsTable.enabled, true)));
    if (m) modelApiId = m.modelId;
  }
  if (!modelApiId) {
    const [defaultModel] = await db.select().from(aiModelsTable).where(and(eq(aiModelsTable.isDefault, true), eq(aiModelsTable.enabled, true)));
    if (defaultModel) modelApiId = defaultModel.modelId;
  }
  if (!modelApiId) {
    const [anyModel] = await db.select().from(aiModelsTable).where(eq(aiModelsTable.enabled, true));
    if (anyModel) modelApiId = anyModel.modelId;
  }

  // Build history
  const historyMessages = await db.select().from(messagesTable).where(eq(messagesTable.chatId, id)).orderBy(messagesTable.createdAt);

  // Build system prompt (never summarized)
  const characterSystemPrompt = `You are ${character?.name || "an AI character"}, ${character?.age || 18} years old.
Personality: ${character?.personality || ""}
Description: ${character?.description || ""}
Background: ${character?.backgroundStory || ""}
Lore: ${character?.lore || ""}

The user's persona is ${persona?.name || "the user"}: ${persona?.description || ""}.
${chat.systemPrompt ? `\nAdditional context: ${chat.systemPrompt}` : ""}

Stay in character at all times. NSFW content is permitted only for characters who are 18 or older. Reject any request that involves characters below 18 in inappropriate scenarios.`;

  // Build messages for AI
  const nonSystemHistory: ChatMessage[] = historyMessages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Check if we need to summarize
  const historyText = nonSystemHistory.map(m => m.content).join(" ");
  const historyTokens = estimateTokenCount(historyText);

  let contextMessages: ChatMessage[] = nonSystemHistory;
  if (historyTokens > sumThreshold) {
    try {
      const summary = await summarizeHistory(nonSystemHistory);
      contextMessages = [{ role: "user", content: `[Conversation summary so far: ${summary}]` }];
      logger.info({ chatId: id }, "Context summarized");
    } catch (err) {
      logger.warn({ err }, "Summarization failed, using full history");
    }
  }

  const aiMessages: ChatMessage[] = [
    { role: "system", content: characterSystemPrompt },
    ...contextMessages,
    { role: "user", content },
  ];

  // Save user message
  const [userMsg] = await db.insert(messagesTable).values({ chatId: id, role: "user", content }).returning();

  let aiResponse: { content: string; modelUsed: string };
  try {
    if (modelApiId) {
      aiResponse = await callMainModel(aiMessages, modelApiId, providerEndpoint, providerApiKey);
    } else {
      aiResponse = await callCheapModelWithFallback(aiMessages);
    }
  } catch (err) {
    logger.error({ err }, "All models failed");
    await db.delete(messagesTable).where(eq(messagesTable.id, userMsg.id));
    res.status(503).json({ error: "All AI models failed. Please try again later." });
    return;
  }

  const [assistantMsg] = await db.insert(messagesTable).values({
    chatId: id,
    role: "assistant",
    content: aiResponse.content,
    modelUsed: aiResponse.modelUsed,
  }).returning();

  await db.update(chatsTable).set({ lastMessageAt: new Date() }).where(eq(chatsTable.id, id));

  res.json({ userMessage: userMsg, assistantMessage: assistantMsg, modelUsed: aiResponse.modelUsed, blocked: false, blockReason: null });
});

// DELETE /chats/:id/messages/:msgId
router.delete("/chats/:id/messages/:msgId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const msgId = parseInt(Array.isArray(req.params.msgId) ? req.params.msgId[0] : req.params.msgId, 10);
  const [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.id, id), eq(chatsTable.userId, userId)));
  if (!chat) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(messagesTable).where(and(eq(messagesTable.id, msgId), eq(messagesTable.chatId, id)));
  res.sendStatus(204);
});

export default router;
