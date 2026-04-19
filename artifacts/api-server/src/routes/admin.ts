import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, adminSettingsTable, aiModelsTable, charactersTable, chatsTable, messagesTable, personasTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";

const router = Router();

// GET /admin/settings
router.get("/admin/settings", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  let [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(adminSettingsTable).values({
      aiProviderName: "NVIDIA",
      aiProviderEndpoint: "https://integrate.api.nvidia.com/v1",
      maxContextSize: 20000,
      contextSummarizationThreshold: 20000,
    }).returning();
  }
  // mask API key
  const result = { ...settings, aiProviderApiKey: settings.aiProviderApiKey ? "***hidden***" : null };
  res.json(result);
});

// PATCH /admin/settings
router.patch("/admin/settings", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  const { aiProviderName, aiProviderEndpoint, aiProviderApiKey, maxContextSize, contextSummarizationThreshold } = req.body;
  const updates: Partial<typeof adminSettingsTable.$inferInsert> = {};
  if (aiProviderName != null) updates.aiProviderName = aiProviderName;
  if (aiProviderEndpoint != null) updates.aiProviderEndpoint = aiProviderEndpoint;
  if (aiProviderApiKey != null && aiProviderApiKey !== "***hidden***") updates.aiProviderApiKey = aiProviderApiKey;
  if (maxContextSize != null) updates.maxContextSize = maxContextSize;
  if (contextSummarizationThreshold != null) updates.contextSummarizationThreshold = contextSummarizationThreshold;

  let [settings] = await db.select().from(adminSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(adminSettingsTable).values({
      aiProviderName: "NVIDIA",
      aiProviderEndpoint: "https://integrate.api.nvidia.com/v1",
      maxContextSize: 20000,
      contextSummarizationThreshold: 20000,
      ...updates,
    }).returning();
  } else {
    [settings] = await db.update(adminSettingsTable).set(updates).where(eq(adminSettingsTable.id, settings.id)).returning();
  }
  res.json({ ...settings, aiProviderApiKey: settings.aiProviderApiKey ? "***hidden***" : null });
});

// GET /admin/models/available — fetch available models from the configured provider
router.get("/admin/models/available", requireAuth, requireAdmin, async (_req: any, res: any): Promise<void> => {
  let [settings] = await db.select().from(adminSettingsTable).limit(1);
  const endpoint = settings?.aiProviderEndpoint || "https://integrate.api.nvidia.com/v1";
  const apiKey = settings?.aiProviderApiKey || process.env.NVIDIA_API_KEY || "";

  try {
    const response = await fetch(`${endpoint}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      res.status(502).json({ error: `Provider returned ${response.status}` });
      return;
    }
    const data = (await response.json()) as { data?: unknown[] };
    res.json(data.data ?? []);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach AI provider" });
  }
});

// GET /admin/models
router.get("/admin/models", requireAuth, requireAdmin, async (_req: any, res: any): Promise<void> => {
  const models = await db.select().from(aiModelsTable).orderBy(aiModelsTable.id);
  res.json(models);
});

// POST /admin/models
router.post("/admin/models", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  const { modelId, displayName, isDefault } = req.body;
  if (!modelId || !displayName) {
    res.status(400).json({ error: "modelId and displayName are required" });
    return;
  }
  // If setting as default, unset others
  if (isDefault) {
    await db.update(aiModelsTable).set({ isDefault: false });
  }
  const [model] = await db.insert(aiModelsTable).values({ modelId, displayName, enabled: true, isDefault: isDefault ?? false }).returning();
  res.status(201).json(model);
});

// PATCH /admin/models/:id
router.patch("/admin/models/:id", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { displayName, enabled, isDefault } = req.body;
  const updates: Partial<typeof aiModelsTable.$inferInsert> = {};
  if (displayName != null) updates.displayName = displayName;
  if (enabled != null) updates.enabled = enabled;
  if (isDefault != null) {
    if (isDefault) await db.update(aiModelsTable).set({ isDefault: false });
    updates.isDefault = isDefault;
  }
  const [model] = await db.update(aiModelsTable).set(updates).where(eq(aiModelsTable.id, id)).returning();
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json(model);
});

// DELETE /admin/models/:id
router.delete("/admin/models/:id", requireAuth, requireAdmin, async (req: any, res: any): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(aiModelsTable).where(eq(aiModelsTable.id, id));
  res.sendStatus(204);
});

// GET /admin/stats
router.get("/admin/stats", requireAuth, requireAdmin, async (_req: any, res: any): Promise<void> => {
  const [chars, chatsCount, msgs, models] = await Promise.all([
    db.select().from(charactersTable),
    db.select().from(chatsTable),
    db.select().from(messagesTable),
    db.select().from(aiModelsTable).where(eq(aiModelsTable.enabled, true)),
  ]);
  res.json({
    totalUsers: 0,
    totalCharacters: chars.length,
    totalChats: chatsCount.length,
    totalMessages: msgs.length,
    activeModels: models.length,
  });
});

export default router;
