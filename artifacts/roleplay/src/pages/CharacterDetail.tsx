import { useParams, useLocation } from "wouter";
import { useGetCharacter, useDeleteCharacter, useListPersonas, useCreateChat, getListChatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: character, isLoading } = useGetCharacter(Number(id));
  const { data: personas } = useListPersonas();
  const { user } = useAuth();
  const deleteCharacter = useDeleteCharacter();
  const createChat = useCreateChat();
  const queryClient = useQueryClient();
  const [showPersonaSelect, setShowPersonaSelect] = useState(false);
  const [starting, setStarting] = useState(false);

  const isOwner = user?.id === character?.ownerUserId;

  const handleStartChat = async (personaId: number) => {
    setStarting(true);
    try {
      const chat = await createChat.mutateAsync({ data: { characterId: Number(id), personaId } });
      queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() });
      setLocation(`/chats/${chat.id}`);
    } catch {
      setStarting(false);
    }
  };

  const handleClickStart = () => {
    const mainPersona = personas?.find(p => p.isMain);
    const firstPersona = personas?.[0];
    const pId = mainPersona?.id ?? firstPersona?.id;
    if (pId) {
      handleStartChat(pId);
    } else if (personas && personas.length > 0) {
      setShowPersonaSelect(true);
    } else {
      setShowPersonaSelect(true);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this character?")) return;
    await deleteCharacter.mutateAsync({ id: Number(id) });
    setLocation("/discover");
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-96 rounded-2xl animate-pulse" style={{ background: "rgba(255,0,170,0.08)" }} />
      </div>
    );
  }

  if (!character) {
    return <div className="max-w-4xl mx-auto px-6 py-8 text-center text-muted-foreground">Character not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="rounded-3xl overflow-hidden" style={{
        background: "rgba(15,0,35,0.7)",
        border: "1px solid rgba(255,0,170,0.3)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 60px rgba(255,0,170,0.1)",
      }}>
        {/* Header */}
        <div className="relative h-48 flex items-end px-8 pb-4" style={{
          background: "linear-gradient(135deg, rgba(255,0,170,0.15) 0%, rgba(155,89,255,0.1) 100%)",
          borderBottom: "1px solid rgba(255,0,170,0.2)",
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `linear-gradient(rgba(255,0,170,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,170,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }} />
          <div className="relative flex items-end gap-6">
            <div className="w-28 h-28 rounded-2xl overflow-hidden ring-2 ring-primary/50" style={{ boxShadow: "0 0 20px rgba(255,0,170,0.4)" }}>
              {character.profilePicture ? (
                <img src={character.profilePicture} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/50" style={{ background: "rgba(255,0,170,0.1)", fontFamily: "Rajdhani, serif" }}>
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{ fontFamily: "Rajdhani, serif", textShadow: "0 0 20px rgba(255,0,170,0.5)" }}>{character.name}</h1>
              <p className="text-muted-foreground">Age {character.age} · {character.chatCount} chats</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Tags */}
          {character.tags && character.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {character.tags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs" style={{ background: "rgba(255,0,170,0.12)", border: "1px solid rgba(255,0,170,0.3)", color: "#ff00aa" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Intro message */}
          <div className="rounded-xl p-4 italic text-muted-foreground" style={{ background: "rgba(255,0,170,0.05)", border: "1px solid rgba(255,0,170,0.15)" }}>
            "{character.introMessage}"
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <InfoBlock title="Personality" content={character.personality} />
            <InfoBlock title="Description" content={character.description} />
            <InfoBlock title="Background Story" content={character.backgroundStory} />
            <InfoBlock title="Lore" content={character.lore} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-primary/10">
            {showPersonaSelect ? (
              <div className="w-full space-y-3">
                <p className="text-sm text-muted-foreground">Select a persona to chat as:</p>
                {!personas || personas.length === 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">You have no personas yet. Create one first!</p>
                    <button
                      onClick={() => setLocation("/personas")}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ background: "rgba(255,0,170,0.2)", border: "1px solid rgba(255,0,170,0.4)", color: "#ff00aa" }}
                    >
                      Go to Personas
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {personas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleStartChat(p.id)}
                        disabled={starting}
                        className="px-4 py-2 rounded-lg text-sm transition-all"
                        style={{
                          background: p.isMain ? "rgba(255,0,170,0.2)" : "rgba(255,255,255,0.05)",
                          border: p.isMain ? "1px solid rgba(255,0,170,0.5)" : "1px solid rgba(255,255,255,0.15)",
                          color: p.isMain ? "#ff00aa" : "inherit",
                          opacity: starting ? 0.7 : 1,
                        }}
                      >
                        {starting ? "Starting..." : `${p.name}${p.isMain ? " (Main)" : ""}`}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowPersonaSelect(false)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleClickStart}
                disabled={starting}
                className="px-8 py-3 rounded-full font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
                  boxShadow: "0 0 20px rgba(255,0,170,0.4)",
                  color: "white",
                  opacity: starting ? 0.7 : 1,
                }}
              >
                {starting ? "Starting..." : "Start Chat"}
              </button>
            )}

            {isOwner && (
              <>
                <button
                  onClick={() => setLocation(`/characters/${id}/edit`)}
                  className="px-6 py-3 rounded-full font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 rounded-full font-semibold transition-all"
                  style={{ background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff4444" }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,0,170,0.04)", border: "1px solid rgba(255,0,170,0.12)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
    </div>
  );
}
