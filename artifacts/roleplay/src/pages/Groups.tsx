import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  useListGroups, useCreateGroup, useDeleteGroup, useGetGroup, useSendGroupMessage,
  useListPersonas, useListCharacters, useListGroupInvites, useRespondGroupInvite,
  getListGroupsQueryKey, getGetGroupQueryKey, getListGroupInvitesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function GroupsList() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useListGroups();
  const { data: invites } = useListGroupInvites();
  const createGroup = useCreateGroup();
  const { data: personas } = useListPersonas();
  const { data: characters } = useListCharacters();
  const respondInvite = useRespondGroupInvite();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [personaId, setPersonaId] = useState("");
  const [selectedChars, setSelectedChars] = useState<number[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !personaId) return;
    await createGroup.mutateAsync({ data: { name: groupName, personaId: Number(personaId), characterIds: selectedChars } });
    qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
    setShowCreate(false);
    setGroupName(""); setPersonaId(""); setSelectedChars([]);
  };

  const handleRespond = async (id: number, accept: boolean) => {
    await respondInvite.mutateAsync({ id, data: { accept } });
    qc.invalidateQueries({ queryKey: getListGroupInvitesQueryKey() });
    qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
  };

  const pendingInvites = invites?.filter(i => i.status === "pending") || [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>Group Chats</h1>
          <p className="text-muted-foreground">Chat with multiple bots and friends at once</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-5 py-2.5 rounded-full font-semibold text-sm" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>
          + New Group
        </button>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-primary">Pending Invites</h2>
          {pendingInvites.map(invite => (
            <div key={invite.id} className="p-4 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,0,170,0.08)", border: "1px solid rgba(255,0,170,0.3)" }}>
              <p className="text-sm">
                Do you want to join <strong className="text-primary">{invite.inviterPersona?.name}</strong>'s group chat: <strong>{invite.group?.name}</strong>?
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleRespond(invite.id, true)} className="px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>Yes</button>
                <button onClick={() => handleRespond(invite.id, false)} className="px-4 py-1.5 rounded-full text-sm" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>No</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-5 rounded-2xl space-y-4" style={{ background: "rgba(15,0,35,0.7)", border: "1px solid rgba(255,0,170,0.25)" }}>
          <h3 className="font-bold text-lg" style={{ fontFamily: "Rajdhani, serif" }}>Create Group Chat</h3>
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name..." required className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50" />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Your Persona</label>
            <select value={personaId} onChange={e => setPersonaId(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 focus:outline-none focus:border-primary/50">
              <option value="">Select persona...</option>
              {personas?.map(p => <option key={p.id} value={p.id}>{p.name}{p.isMain ? " (Main)" : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Add Characters (optional)</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {characters?.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedChars(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} className="px-3 py-1 rounded-full text-xs transition-all" style={{
                  background: selectedChars.includes(c.id) ? "rgba(255,0,170,0.25)" : "rgba(255,255,255,0.05)",
                  border: selectedChars.includes(c.id) ? "1px solid rgba(255,0,170,0.6)" : "1px solid rgba(255,255,255,0.15)",
                  color: selectedChars.includes(c.id) ? "#ff00aa" : "inherit",
                }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createGroup.isPending} className="px-6 py-2 rounded-full font-bold text-sm" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Groups list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />)}</div>
      ) : !groups || groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No group chats yet.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((group: any) => (
            <div key={group.id} onClick={() => setLocation(`/groups/${group.id}`)} className="p-4 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.15)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{group.name}</div>
                  <div className="text-sm text-muted-foreground">{group.members?.length || 0} members</div>
                </div>
                <div className="flex -space-x-2">
                  {group.members?.slice(0, 4).map((m: any) => (
                    <div key={m.id} className="w-8 h-8 rounded-lg ring-1 ring-background overflow-hidden" style={{ background: "rgba(255,0,170,0.1)" }}>
                      {m.character?.profilePicture ? (
                        <img src={m.character.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary/50">
                          {(m.character?.name || m.persona?.name || "?").charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: group, isLoading } = useGetGroup(Number(id));
  const { data: personas } = useListPersonas();
  const sendGroupMessage = useSendGroupMessage();
  const deleteGroup = useDeleteGroup();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [activePersId, setActivePersId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (group) {
      setMessages(group.messages || []);
      const main = personas?.find(p => p.isMain);
      if (main) setActivePersId(main.id);
      else if (personas?.[0]) setActivePersId(personas[0].id);
    }
  }, [group?.id, personas]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !activePersId || sendGroupMessage.isPending) return;
    setInput("");
    setIsTyping(true);
    const persona = personas?.find(p => p.id === activePersId);
    const tempMsg = { id: -1, senderName: persona?.name || "You", senderType: "user", content, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const result = await sendGroupMessage.mutateAsync({ id: Number(id), data: { content, personaId: activePersId } });
      setMessages(prev => [...prev.filter(m => m.id !== -1), ...result]);
      qc.invalidateQueries({ queryKey: getGetGroupQueryKey(Number(id)) });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== -1));
    } finally {
      setIsTyping(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this group chat?")) return;
    await deleteGroup.mutateAsync({ id: Number(id) });
    setLocation("/groups");
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  if (!group) return <div className="flex items-center justify-center h-screen text-muted-foreground">Group not found.</div>;

  const botMembers = group.members?.filter((m: any) => m.memberType === "character") || [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ background: "rgba(10,0,25,0.8)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,0,170,0.2)" }}>
        <button onClick={() => setLocation("/groups")} className="text-muted-foreground hover:text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div className="flex-1">
          <div className="font-bold" style={{ fontFamily: "Rajdhani, serif" }}>{group.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {botMembers.slice(0, 5).map((m: any) => (
              <span key={m.id} className="text-xs text-muted-foreground">{m.character?.name}</span>
            ))}
          </div>
        </div>
        <div className="flex -space-x-1">
          {group.members?.slice(0, 5).map((m: any) => (
            <div key={m.id} className="w-7 h-7 rounded-full ring-1 ring-background overflow-hidden" style={{ background: "rgba(255,0,170,0.1)" }}>
              {m.character?.profilePicture ? <img src={m.character.profilePicture} alt="" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary/50">
                  {(m.character?.name || m.persona?.name || "?").charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleDelete} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(255,0,0,0.08)", color: "#ff6666" }}>Delete</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg, i) => {
          const isUser = msg.senderType === "user";
          const isSystem = msg.senderType === "system";
          if (isSystem) return (
            <div key={msg.id || i} className="text-center text-xs text-muted-foreground py-1">{msg.content}</div>
          );
          return (
            <div key={msg.id || i} className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2`}>
              <div>
                <div className={`text-xs mb-1 ${isUser ? "text-right text-primary/70" : "text-muted-foreground"}`}>{msg.senderName}</div>
                <div className="px-4 py-2 rounded-2xl text-sm" style={isUser ? {
                  background: "linear-gradient(135deg, rgba(255,0,170,0.3), rgba(155,89,255,0.2))",
                  border: "1px solid rgba(255,0,170,0.35)",
                  borderRadius: "16px 16px 4px 16px",
                } : {
                  background: "rgba(20,0,45,0.65)",
                  border: "1px solid rgba(155,89,255,0.2)",
                  borderRadius: "16px 16px 16px 4px",
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(20,0,45,0.65)", border: "1px solid rgba(155,89,255,0.2)" }}>
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 shrink-0" style={{ background: "rgba(10,0,25,0.9)", borderTop: "1px solid rgba(255,0,170,0.15)" }}>
        {personas && personas.length > 0 && (
          <div className="mb-2">
            <select value={activePersId ?? ""} onChange={e => setActivePersId(Number(e.target.value))} className="text-xs px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 focus:outline-none">
              {personas.map(p => <option key={p.id} value={p.id}>Chatting as: {p.name}{p.isMain ? " (Main)" : ""}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl text-sm resize-none focus:outline-none border border-primary/20 bg-primary/5 focus:border-primary/50"
          />
          <button onClick={handleSend} disabled={!input.trim() || !activePersId} className="px-5 py-3 rounded-xl font-bold" style={{
            background: input.trim() ? "linear-gradient(135deg, #ff00aa, #9b59ff)" : "rgba(255,0,170,0.1)",
            color: input.trim() ? "white" : "rgba(255,255,255,0.3)",
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}
