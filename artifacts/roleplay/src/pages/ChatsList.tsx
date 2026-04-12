import { useLocation } from "wouter";
import { useListChats } from "@workspace/api-client-react";

export default function ChatsList() {
  const [, setLocation] = useLocation();
  const { data: chats, isLoading } = useListChats();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>My Chats</h1>
          <p className="text-muted-foreground">Your ongoing stories</p>
        </div>
        <button onClick={() => setLocation("/discover")} className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all" style={{
          background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
          color: "white",
          boxShadow: "0 0 15px rgba(255,0,170,0.3)",
        }}>
          + New Chat
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />
          ))}
        </div>
      ) : !chats || chats.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-30" style={{ fontFamily: "Rajdhani, serif" }}>~</div>
          <p className="text-muted-foreground mb-6">No chats yet. Discover a character to start your first story.</p>
          <button onClick={() => setLocation("/discover")} className="px-6 py-3 rounded-full" style={{ background: "linear-gradient(135deg, #ff00aa, #9b59ff)", color: "white" }}>
            Discover Characters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat: any) => (
            <div
              key={chat.id}
              onClick={() => setLocation(`/chats/${chat.id}`)}
              className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer group transition-all hover:scale-[1.01]"
              style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-primary/30">
                {chat.character?.profilePicture ? (
                  <img src={chat.character.profilePicture} alt={chat.character.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-primary/50" style={{ background: "rgba(255,0,170,0.08)", fontFamily: "Rajdhani, serif" }}>
                    {chat.character?.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold group-hover:text-primary transition-colors">{chat.character?.name}</div>
                <div className="text-sm text-muted-foreground">As {chat.persona?.name}</div>
              </div>
              {chat.lastMessageAt && (
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(chat.lastMessageAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
