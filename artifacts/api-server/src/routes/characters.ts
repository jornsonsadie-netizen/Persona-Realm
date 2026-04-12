import { Router } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, charactersTable } from "@workspace/db";
import { requireAuth, optionalAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /characters
router.get("/characters", optionalAuth, async (req, res): Promise<void> => {
  const { search, tags, mine } = req.query;
  const userId = (req as any).userId;

  let query = db.select().from(charactersTable);
  const conditions: any[] = [];

  if (mine === "true" && userId) {
    conditions.push(eq(charactersTable.ownerUserId, userId));
  }
  if (search && typeof search === "string") {
    conditions.push(
      or(
        ilike(charactersTable.name, `%${search}%`),
        ilike(charactersTable.description, `%${search}%`),
        ilike(charactersTable.personality, `%${search}%`),
      )
    );
  }
  if (tags && typeof tags === "string") {
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      conditions.push(
        sql`${charactersTable.tags} && ARRAY[${sql.join(tagList.map(t => sql`${t}`), sql`, `)}]::text[]`
      );
    }
  }

  const whereClause = conditions.length > 0 ? conditions.reduce((a, b) => sql`${a} AND ${b}`) : undefined;
  const characters = whereClause
    ? await db.select().from(charactersTable).where(whereClause).orderBy(sql`${charactersTable.chatCount} DESC`)
    : await db.select().from(charactersTable).orderBy(sql`${charactersTable.chatCount} DESC`);

  res.json(characters);
});

// GET /characters/featured
router.get("/characters/featured", async (_req, res): Promise<void> => {
  const characters = await db.select().from(charactersTable).orderBy(sql`${charactersTable.chatCount} DESC`).limit(12);
  res.json(characters);
});

// POST /characters
router.post("/characters", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { name, age, personality, description, profilePicture, backgroundStory, lore, introMessage, tags } = req.body;
  if (!name || age == null || !personality || !description || !backgroundStory || !lore || !introMessage) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  if (Number(age) < 18) {
    res.status(400).json({ error: "Character must be above 18" });
    return;
  }
  const [character] = await db.insert(charactersTable).values({
    ownerUserId: userId,
    name,
    age: Number(age),
    personality,
    description,
    profilePicture: profilePicture || null,
    backgroundStory,
    lore,
    introMessage,
    tags: Array.isArray(tags) ? tags : [],
  }).returning();
  res.status(201).json(character);
});

// GET /characters/:id
router.get("/characters/:id", optionalAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [character] = await db.select().from(charactersTable).where(eq(charactersTable.id, id));
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  res.json(character);
});

// PATCH /characters/:id
router.patch("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(charactersTable).where(eq(charactersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  if (existing.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, age, personality, description, profilePicture, backgroundStory, lore, introMessage, tags } = req.body;
  if (age != null && Number(age) < 18) {
    res.status(400).json({ error: "Character must be above 18" });
    return;
  }
  const updates: Partial<typeof charactersTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (age != null) updates.age = Number(age);
  if (personality != null) updates.personality = personality;
  if (description != null) updates.description = description;
  if (profilePicture !== undefined) updates.profilePicture = profilePicture;
  if (backgroundStory != null) updates.backgroundStory = backgroundStory;
  if (lore != null) updates.lore = lore;
  if (introMessage != null) updates.introMessage = introMessage;
  if (tags != null) updates.tags = Array.isArray(tags) ? tags : [];
  const [updated] = await db.update(charactersTable).set(updates).where(eq(charactersTable.id, id)).returning();
  res.json(updated);
});

// DELETE /characters/:id
router.delete("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(charactersTable).where(eq(charactersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  if (existing.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(charactersTable).where(eq(charactersTable.id, id));
  res.sendStatus(204);
});

export default router;
