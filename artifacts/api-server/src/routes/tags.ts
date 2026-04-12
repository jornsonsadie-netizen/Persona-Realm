import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tagsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/tags", async (_req, res): Promise<void> => {
  const tags = await db.select().from(tagsTable).orderBy(tagsTable.usageCount);
  res.json(tags);
});

router.post("/tags", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const normalized = name.toLowerCase().trim();
  const [existing] = await db.select().from(tagsTable).where(eq(tagsTable.name, normalized));
  if (existing) {
    res.status(201).json(existing);
    return;
  }
  const [tag] = await db.insert(tagsTable).values({ name: normalized }).returning();
  res.status(201).json(tag);
});

export default router;
