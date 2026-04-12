import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useListDmConversations, useGetDmMessages, useSendDm, useListPersonas, getGetDmMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function MessagesList() {
  const [, setLocation] = useLocation();
  const { data: conversations, isLoading } = useListDmConversations();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>Messages</h1>
        <p className="text-muted-foreground">Direct messages with other personas</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />)}</div>
      ) : !conversations || conversations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No conversations yet. Find people in the People section.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv: any) => (
            <div key={conv.personaId} onClick={() => setLocation(`/messages/${conv.personaId}`)} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-all" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.15)" }}>
              {conv.persona?.avatarUrl ? (
                <img src={conv.persona.avatarUrl} alt={conv.persona.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-primary/30" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-primary/50" style={{ background: "rgba(255,0,170,0.08)", fontFamily: "Rajdhani, serif" }}>
                  {conv.persona?.name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{conv.persona?.name}</div>
                {conv.lastMessage && <div className="text-sm text-muted-foreground truncate">{conv.lastMessage}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DmRoom() {
  const { personaId } = useParams<{ personaId: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: messages, isLoading } = useGetDmMessages(Number(personaId));
  const { data: myPersonas } = useListPersonas();
  const sendDm = useSendDm();
  const [input, setInput] = useState("");
  const [fromPersonaId, setFromPersonaId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const main = myPersonas?.find(p => p.isMain) || myPersonas?.[0];
    if (main) setFromPersonaId(main.id);
  }, [myPersonas]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !fromPersonaId) return;
    setInput("");
    await sendDm.mutateAsync({ data: { toPersonaId: Number(personaId), fromPersonaId, content } });
    qc.invalidateQueries({ queryKey: getGetDmMessagesQueryKey(Number(personaId)) });
  };

  const partnerPersonaId = Number(personaId);
  const myPersonaIds = myPersonas?.map(p => p.id) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ background: "rgba(10,0,25,0.8)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,0,170,0.2)" }}>
        <button onClick={() => setLocation("/messages")} className="text-muted-foreground hover:text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div className="font-bold" style={{ fontFamily: "Rajdhani, serif" }}>Direct Message</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages?.map((msg: any, i: number) => {
          const isMine = myPersonaIds.includes(msg.fromPersonaId);
          return (
            <div key={msg.id || i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="px-4 py-2 rounded-2xl text-sm max-w-[70%]" style={isMine ? {
                background: "linear-gradient(135deg, rgba(255,0,170,0.3), rgba(155,89,255,0.2))",
                border: "1px solid rgba(255,0,170,0.35)",
                borderRadius: "16px 16px 4px 16px",
              } : {
                background: "rgba(20,0,45,0.65)",
                border: "1px solid rgba(155,89,255,0.2)",
                borderRadius: "16px 16px 16px 4px",
              }}>
                <div className="text-xs mb-1 opacity-50">{msg.fromPersona?.name}</div>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-5 py-3 shrink-0" style={{ background: "rgba(10,0,25,0.9)", borderTop: "1px solid rgba(255,0,170,0.15)" }}>
        {myPersonas && myPersonas.length > 1 && (
          <div className="mb-2">
            <select value={fromPersonaId ?? ""} onChange={e => setFromPersonaId(Number(e.target.value))} className="text-xs px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 focus:outline-none">
              {myPersonas.map(p => <option key={p.id} value={p.id}>As: {p.name}{p.isMain ? " (Main)" : ""}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSend(); }} placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none border border-primary/20 bg-primary/5 focus:border-primary/50" />
          <button onClick={handleSend} disabled={!input.trim() || !fromPersonaId} className="px-5 py-3 rounded-xl font-bold" style={{ background: input.trim() ? "linear-gradient(135deg, #ff00aa, #9b59ff)" : "rgba(255,0,170,0.1)", color: input.trim() ? "white" : "rgba(255,255,255,0.3)" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
