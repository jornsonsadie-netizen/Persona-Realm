import { Router } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, personasTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /personas
router.get("/personas", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const personas = await db.select().from(personasTable).where(eq(personasTable.ownerUserId, userId));
  res.json(personas);
});

// GET /personas/search
router.get("/personas/search", async (req, res): Promise<void> => {
  const { q } = req.query;
  let personas;
  if (q && typeof q === "string") {
    personas = await db.select().from(personasTable).where(
      or(ilike(personasTable.name, `%${q}%`), ilike(personasTable.description, `%${q}%`))
    );
  } else {
    personas = await db.select().from(personasTable).limit(50);
  }
  res.json(personas);
});

// POST /personas
router.post("/personas", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { name, age, personality, description, lore, tags, avatarUrl } = req.body;
  if (!name || age == null || !personality || !description || !lore) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const [persona] = await db.insert(personasTable).values({
    ownerUserId: userId,
    name,
    age: Number(age),
    personality,
    description,
    lore,
    tags: Array.isArray(tags) ? tags : [],
    avatarUrl: avatarUrl || null,
    isMain: false,
  }).returning();
  res.status(201).json(persona);
});

// GET /personas/:id
router.get("/personas/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, id));
  if (!persona) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }
  res.json(persona);
});

// PATCH /personas/:id
router.patch("/personas/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(personasTable).where(eq(personasTable.id, id));
  if (!existing || existing.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, age, personality, description, lore, tags, avatarUrl } = req.body;
  const updates: Partial<typeof personasTable.$inferInsert> = {};
  if (name != null) updates.name = name;
  if (age != null) updates.age = Number(age);
  if (personality != null) updates.personality = personality;
  if (description != null) updates.description = description;
  if (lore != null) updates.lore = lore;
  if (tags != null) updates.tags = Array.isArray(tags) ? tags : [];
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  const [updated] = await db.update(personasTable).set(updates).where(eq(personasTable.id, id)).returning();
  res.json(updated);
});

// DELETE /personas/:id
router.delete("/personas/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(personasTable).where(eq(personasTable.id, id));
  if (!existing || existing.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(personasTable).where(eq(personasTable.id, id));
  res.sendStatus(204);
});

// POST /personas/:id/main
router.post("/personas/:id/main", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  // unset all mains for this user
  await db.update(personasTable).set({ isMain: false }).where(eq(personasTable.ownerUserId, userId));
  const [existing] = await db.select().from(personasTable).where(eq(personasTable.id, id));
  if (!existing || existing.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [updated] = await db.update(personasTable).set({ isMain: true }).where(eq(personasTable.id, id)).returning();
  res.json(updated);
});

export default router;
