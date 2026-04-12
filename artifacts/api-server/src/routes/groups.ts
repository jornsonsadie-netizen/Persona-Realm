import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, groupChatsTable, groupMembersTable, groupMessagesTable, groupInvitesTable, charactersTable, personasTable, aiModelsTable, adminSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { runCsamFilter, callMainModel, callCheapModelWithFallback, type ChatMessage } from "../lib/nvidiaGateway";
import { logger } from "../lib/logger";

const router = Router();

async function buildGroupResponse(group: any) {
  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
  const enrichedMembers = await Promise.all(members.map(async (m) => {
    const character = m.characterId ? (await db.select().from(charactersTable).where(eq(charactersTable.id, m.characterId)).then(r => r[0])) : null;
    const persona = m.personaId ? (await db.select().from(personasTable).where(eq(personasTable.id, m.personaId)).then(r => r[0])) : null;
    return { ...m, character, persona };
  }));
  return { ...group, members: enrichedMembers };
}

// GET /groups
router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const groups = await db.select().from(groupChatsTable).where(eq(groupChatsTable.ownerUserId, userId));
  const enriched = await Promise.all(groups.map(buildGroupResponse));
  res.json(enriched);
});

// POST /groups
router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { name, personaId, characterIds } = req.body;
  if (!name || !personaId) {
    res.status(400).json({ error: "name and personaId are required" });
    return;
  }
  const [group] = await db.insert(groupChatsTable).values({ name, ownerUserId: userId }).returning();

  // Add creator persona as member
  await db.insert(groupMembersTable).values({ groupId: group.id, memberType: "persona", personaId: Number(personaId), userId });

  // Add character members
  if (Array.isArray(characterIds)) {
    for (const cid of characterIds) {
      await db.insert(groupMembersTable).values({ groupId: group.id, memberType: "character", characterId: Number(cid) });
    }
  }

  res.status(201).json(await buildGroupResponse(group));
});

// GET /groups/:id
router.get("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, id));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const enriched = await buildGroupResponse(group);
  const messages = await db.select().from(groupMessagesTable).where(eq(groupMessagesTable.groupId, id)).orderBy(groupMessagesTable.createdAt);
  res.json({ ...enriched, messages });
});

// DELETE /groups/:id
router.delete("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, id));
  if (!group || group.ownerUserId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(groupMessagesTable).where(eq(groupMessagesTable.groupId, id));
  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  await db.delete(groupChatsTable).where(eq(groupChatsTable.id, id));
  res.sendStatus(204);
});

// POST /groups/:id/members
router.post("/groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { memberType, characterId, personaId } = req.body;
  await db.insert(groupMembersTable).values({
    groupId: id,
    memberType,
    characterId: characterId ? Number(characterId) : null,
    personaId: personaId ? Number(personaId) : null,
  });
  const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, id));
  const enriched = await buildGroupResponse(group);

  // Notify bots about new member
  const [newMember] = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, id)).then(r => r.slice(-1));
  let newMemberName = "someone";
  if (newMember.characterId) {
    const [c] = await db.select().from(charactersTable).where(eq(charactersTable.id, newMember.characterId));
    if (c) newMemberName = c.name;
  } else if (newMember.personaId) {
    const [p] = await db.select().from(personasTable).where(eq(personasTable.id, newMember.personaId));
    if (p) newMemberName = p.name;
  }
  await db.insert(groupMessagesTable).values({
    groupId: id,
    senderType: "system",
    senderId: null,
    senderName: "System",
    content: `${newMemberName} has joined the group chat.`,
  });

  res.json(enriched);
});

// DELETE /groups/:id/members/:memberId
router.delete("/groups/:id/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const memberId = parseInt(Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId, 10);
  await db.delete(groupMembersTable).where(eq(groupMembersTable.id, memberId));
  res.sendStatus(204);
});

// POST /groups/:id/messages
router.post("/groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { content, personaId } = req.body;
  if (!content || !personaId) {
    res.status(400).json({ error: "content and personaId are required" });
    return;
  }

  const [persona] = await db.select().from(personasTable).where(eq(personasTable.id, Number(personaId)));
  if (!persona) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }

  // CSAM check on user message
  const csamResult = await runCsamFilter(content);
  const newMessages = [];

  // Save user message
  const [userMsg] = await db.insert(groupMessagesTable).values({
    groupId: id,
    senderType: "user",
    senderId: persona.id,
    senderUserId: userId,
    senderName: persona.name,
    content: csamResult.safe ? content : "[Message blocked by safety filter]",
  }).returning();
  newMessages.push(userMsg);

  if (!csamResult.safe) {
    res.json(newMessages);
    return;
  }

  // Get all character members and have them respond
  const members = await db.select().from(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.memberType, "character"))
  );
  const history = await db.select().from(groupMessagesTable).where(eq(groupMessagesTable.groupId, id))
    .orderBy(groupMessagesTable.createdAt).then(r => r.slice(-20));

  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  const [defaultModel] = await db.select().from(aiModelsTable).where(and(eq(aiModelsTable.isDefault, true), eq(aiModelsTable.enabled, true)));
  const [anyModel] = await db.select().from(aiModelsTable).where(eq(aiModelsTable.enabled, true));
  const modelApiId = defaultModel?.modelId || anyModel?.modelId;
  const providerEndpoint = settings?.aiProviderEndpoint || "https://integrate.api.nvidia.com/v1";
  const providerApiKey = settings?.aiProviderApiKey || process.env.NVIDIA_API_KEY || null;

  const groupMemberNames = await Promise.all(members.map(async (m) => {
    if (m.characterId) {
      const [c] = await db.select().from(charactersTable).where(eq(charactersTable.id, m.characterId));
      return c?.name || "Unknown";
    }
    return "Unknown";
  }));

  for (const member of members) {
    if (!member.characterId) continue;
    const [character] = await db.select().from(charactersTable).where(eq(charactersTable.id, member.characterId));
    if (!character) continue;

    const otherMembers = groupMemberNames.filter(n => n !== character.name);
    const systemPrompt = `You are ${character.name} in a group chat. Other members: ${otherMembers.join(", ")}, ${persona.name} (user).
You are NOT allowed to roleplay with any words using the **. You are in a group chat so you must speak like you are chatting someone on social media. Be casual, direct, and natural. React to what others say. Keep responses short and conversational.
Your personality: ${character.personality}`;

    const aiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map(m => ({
        role: (m.senderType === "user" ? "user" : "assistant") as "user" | "assistant",
        content: `${m.senderName}: ${m.content}`,
      })),
      { role: "user", content: `${persona.name}: ${content}` },
    ];

    try {
      let response: { content: string; modelUsed: string };
      if (modelApiId) {
        response = await callMainModel(aiMessages, modelApiId, providerEndpoint, providerApiKey);
      } else {
        response = await callCheapModelWithFallback(aiMessages);
      }
      const [botMsg] = await db.insert(groupMessagesTable).values({
        groupId: id,
        senderType: "character",
        senderId: character.id,
        senderName: character.name,
        content: response.content,
        modelUsed: response.modelUsed,
      }).returning();
      newMessages.push(botMsg);
    } catch (err) {
      logger.error({ err, characterId: character.id }, "Group bot response failed");
    }
  }

  res.json(newMessages);
});

// POST /groups/:id/invite
router.post("/groups/:id/invite", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { inviterPersonaId, inviteePersonaId } = req.body;
  const [invite] = await db.insert(groupInvitesTable).values({
    groupId: id,
    inviterPersonaId: Number(inviterPersonaId),
    inviteePersonaId: Number(inviteePersonaId),
    status: "pending",
  }).returning();

  const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, id));
  const [inviterPersona] = await db.select().from(personasTable).where(eq(personasTable.id, Number(inviterPersonaId)));
  const [inviteePersona] = await db.select().from(personasTable).where(eq(personasTable.id, Number(inviteePersonaId)));

  res.json({ ...invite, group, inviterPersona, inviteePersona });
});

// GET /groups/invites
router.get("/groups/invites", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  // Get personas belonging to this user
  const myPersonas = await db.select().from(personasTable).where(eq(personasTable.ownerUserId, userId));
  const myPersonaIds = myPersonas.map(p => p.id);

  if (myPersonaIds.length === 0) {
    res.json([]);
    return;
  }

  const allInvites = await db.select().from(groupInvitesTable).where(eq(groupInvitesTable.status, "pending"));
  const myInvites = allInvites.filter(i => myPersonaIds.includes(i.inviteePersonaId));

  const enriched = await Promise.all(myInvites.map(async (invite) => {
    const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, invite.groupId));
    const [inviterPersona] = await db.select().from(personasTable).where(eq(personasTable.id, invite.inviterPersonaId));
    const [inviteePersona] = await db.select().from(personasTable).where(eq(personasTable.id, invite.inviteePersonaId));
    return { ...invite, group, inviterPersona, inviteePersona };
  }));
  res.json(enriched);
});

// POST /groups/invites/:id/respond
router.post("/groups/invites/:id/respond", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { accept } = req.body;
  const [invite] = await db.select().from(groupInvitesTable).where(eq(groupInvitesTable.id, id));
  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  const status = accept ? "accepted" : "declined";
  const [updated] = await db.update(groupInvitesTable).set({ status }).where(eq(groupInvitesTable.id, id)).returning();

  if (accept) {
    // Add persona to group
    const [inviteePersna] = await db.select().from(personasTable).where(eq(personasTable.id, invite.inviteePersonaId));
    if (inviteePersna) {
      await db.insert(groupMembersTable).values({
        groupId: invite.groupId,
        memberType: "persona",
        personaId: invite.inviteePersonaId,
        userId,
      });
      // Notify
      await db.insert(groupMessagesTable).values({
        groupId: invite.groupId,
        senderType: "system",
        senderId: null,
        senderName: "System",
        content: `${inviteePersna.name} has joined the group chat.`,
      });
    }
  }

  const [group] = await db.select().from(groupChatsTable).where(eq(groupChatsTable.id, invite.groupId));
  const [inviterPersona] = await db.select().from(personasTable).where(eq(personasTable.id, invite.inviterPersonaId));
  const [inviteePersona] = await db.select().from(personasTable).where(eq(personasTable.id, invite.inviteePersonaId));
  res.json({ ...updated, group, inviterPersona, inviteePersona });
});

export default router;
