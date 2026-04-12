import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetChat, useSendMessage, useDeleteChat, useUpdateChat, useListAdminModels,
  getGetChatQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: chat, isLoading } = useGetChat(Number(id));
  const { data: models } = useListAdminModels();
  const sendMessage = useSendMessage();
  const deleteChat = useDeleteChat();
  const updateChat = useUpdateChat();

  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat) {
      setMessages(chat.messages || []);
      setSystemPrompt(chat.systemPrompt || "");
      setSelectedModel(chat.modelId ?? null);
    }
  }, [chat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sysTokens = estimateTokens(systemPrompt);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    setIsTyping(true);

    const tempUserMsg = { id: -1, role: "user", content, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await sendMessage.mutateAsync({
        id: Number(id),
        data: { content, modelId: selectedModel ?? undefined },
      });
      setMessages(prev => [
        ...prev.filter(m => m.id !== -1),
        result.userMessage,
        result.assistantMessage,
      ]);
      queryClient.invalidateQueries({ queryKey: getGetChatQueryKey(Number(id)) });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== -1));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveSystemPrompt = async () => {
    if (sysTokens > 500) return;
    await updateChat.mutateAsync({ id: Number(id), data: { systemPrompt } });
    setShowSystemPrompt(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this chat and all history?")) return;
    await deleteChat.mutateAsync({ id: Number(id) });
    setLocation("/chats");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  }
  if (!chat) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Chat not found.</div>;
  }

  const character = chat.character;
  const persona = chat.persona;
  const enabledModels = models?.filter(m => m.enabled) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ background: "rgba(10,0,25,0.8)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,0,170,0.2)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/chats")} className="text-muted-foreground hover:text-primary transition-colors mr-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-primary/40" style={{ boxShadow: "0 0 12px rgba(255,0,170,0.3)" }}>
            {character?.profilePicture ? (
              <img src={character.profilePicture} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-primary/60" style={{ background: "rgba(255,0,170,0.1)" }}>
                {character?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="font-bold" style={{ fontFamily: "Rajdhani, serif" }}>{character?.name}</div>
            <div className="text-xs text-muted-foreground">Chatting as {persona?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabledModels.length > 0 && (
            <select
              value={selectedModel ?? ""}
              onChange={e => setSelectedModel(e.target.value ? Number(e.target.value) : null)}
              className="text-xs px-2 py-1 rounded-lg border border-primary/20 bg-primary/5 focus:outline-none"
            >
              <option value="">Default Model</option>
              {enabledModels.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
            </select>
          )}
          <button onClick={() => setShowSystemPrompt(!showSystemPrompt)} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: showSystemPrompt ? "rgba(255,0,170,0.2)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,0,170,0.25)", color: showSystemPrompt ? "#ff00aa" : "inherit" }}>
            System Prompt
          </button>
          <button onClick={handleDelete} className="text-xs px-2 py-1.5 rounded-lg transition-all" style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6666" }}>
            Delete
          </button>
        </div>
      </div>

      {/* System Prompt Panel */}
      {showSystemPrompt && (
        <div className="px-5 py-3 shrink-0" style={{ background: "rgba(255,0,170,0.05)", borderBottom: "1px solid rgba(255,0,170,0.15)" }}>
          <label className="text-xs font-semibold uppercase tracking-wider text-primary/70 block mb-1.5">
            System Prompt ({sysTokens}/500 tokens)
          </label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={3}
            placeholder="Add additional instructions for the character..."
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none border border-primary/20 bg-primary/5 focus:border-primary/50"
          />
          {sysTokens > 500 && <p className="text-xs mt-1" style={{ color: "#ff4444" }}>Over 500 token limit</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveSystemPrompt} disabled={sysTokens > 500} className="text-xs px-4 py-1.5 rounded-lg font-semibold transition-all" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white", opacity: sysTokens > 500 ? 0.5 : 1 }}>
              Save
            </button>
            <button onClick={() => setShowSystemPrompt(false)} className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isBlocked = msg.content?.startsWith("[CONTENT BLOCKED]");
          return (
            <div key={msg.id || i} className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-primary/30">
                  {character?.profilePicture ? (
                    <img src={character.profilePicture} alt={character?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary/60" style={{ background: "rgba(255,0,170,0.1)" }}>
                      {character?.name?.charAt(0)}
                    </div>
                  )}
                </div>
              )}
              <div
                className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={isBlocked ? {
                  background: "rgba(255,0,0,0.1)",
                  border: "1px solid rgba(255,0,0,0.3)",
                  color: "#ff9999",
                  borderRadius: "16px",
                } : isUser ? {
                  background: "linear-gradient(135deg, rgba(255,0,170,0.35), rgba(155,89,255,0.25))",
                  border: "1px solid rgba(255,0,170,0.4)",
                  boxShadow: "0 0 15px rgba(255,0,170,0.15)",
                  borderRadius: "16px 16px 4px 16px",
                } : {
                  background: "rgba(20,0,45,0.7)",
                  border: "1px solid rgba(155,89,255,0.25)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "16px 16px 16px 4px",
                }}
              >
                {msg.content}
                {msg.modelUsed && msg.modelUsed !== "safety-filter" && (
                  <div className="text-xs mt-1 opacity-40">{msg.modelUsed.split("/").pop()}</div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-primary/30" style={{ background: "rgba(255,0,170,0.1)" }}>
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary/60">
                {character?.name?.charAt(0)}
              </div>
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(20,0,45,0.7)", border: "1px solid rgba(155,89,255,0.25)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ background: "rgba(10,0,25,0.9)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,0,170,0.15)" }}>
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl text-sm resize-none focus:outline-none border border-primary/20 bg-primary/5 focus:border-primary/50 transition-all"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="px-5 py-3 rounded-xl font-bold transition-all shrink-0"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #ff00aa, #9b59ff)" : "rgba(255,0,170,0.1)",
              boxShadow: input.trim() ? "0 0 15px rgba(255,0,170,0.3)" : "none",
              color: input.trim() ? "white" : "rgba(255,255,255,0.3)",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
