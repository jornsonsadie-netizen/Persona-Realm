import { Router } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db, dmMessagesTable, personasTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /dm — list conversations
router.get("/dm", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const myPersonas = await db.select().from(personasTable).where(eq(personasTable.ownerUserId, userId));
  const myPersonaIds = myPersonas.map(p => p.id);

  if (myPersonaIds.length === 0) {
    res.json([]);
    return;
  }

  const allMessages = await db.select().from(dmMessagesTable)
    .orderBy(desc(dmMessagesTable.createdAt));

  // Group by conversation partner
  const conversations = new Map<string, any>();
  for (const msg of allMessages) {
    const isMine = myPersonaIds.includes(msg.fromPersonaId);
    if (!isMine && !myPersonaIds.includes(msg.toPersonaId)) continue;
    const partnerId = isMine ? msg.toPersonaId : msg.fromPersonaId;
    const key = `${Math.min(msg.fromPersonaId, msg.toPersonaId)}-${Math.max(msg.fromPersonaId, msg.toPersonaId)}`;
    if (!conversations.has(key)) {
      const [partner] = await db.select().from(personasTable).where(eq(personasTable.id, partnerId));
      const unreadCount = allMessages.filter(m => m.toPersonaId === (myPersonaIds.find(id => id === m.toPersonaId) || -1) && !m.read).length;
      conversations.set(key, {
        personaId: partnerId,
        persona: partner,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount: 0,
      });
    }
  }

  res.json(Array.from(conversations.values()));
});

// GET /dm/:personaId — get messages
router.get("/dm/:personaId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const personaId = parseInt(Array.isArray(req.params.personaId) ? req.params.personaId[0] : req.params.personaId, 10);

  const myPersonas = await db.select().from(personasTable).where(eq(personasTable.ownerUserId, userId));
  const myPersonaIds = myPersonas.map(p => p.id);

  const messages = await db.select().from(dmMessagesTable)
    .where(
      or(
        and(eq(dmMessagesTable.fromPersonaId, personaId)),
        and(eq(dmMessagesTable.toPersonaId, personaId))
      )
    )
    .orderBy(dmMessagesTable.createdAt);

  const relevant = messages.filter(m =>
    myPersonaIds.includes(m.fromPersonaId) || myPersonaIds.includes(m.toPersonaId)
  );

  const enriched = await Promise.all(relevant.map(async (msg) => {
    const [fromPersona] = await db.select().from(personasTable).where(eq(personasTable.id, msg.fromPersonaId));
    return { ...msg, fromPersona };
  }));

  res.json(enriched);
});

// POST /dm
router.post("/dm", requireAuth, async (req, res): Promise<void> => {
  const { toPersonaId, fromPersonaId, content } = req.body;
  if (!toPersonaId || !fromPersonaId || !content) {
    res.status(400).json({ error: "toPersonaId, fromPersonaId and content are required" });
    return;
  }
  const [msg] = await db.insert(dmMessagesTable).values({
    fromPersonaId: Number(fromPersonaId),
    toPersonaId: Number(toPersonaId),
    content,
  }).returning();
  res.status(201).json(msg);
});

export default router;
