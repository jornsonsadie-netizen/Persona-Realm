import { useState } from "react";
import { useLocation } from "wouter";
import { useListCharacters, useListTags } from "@workspace/api-client-react";

export default function Discover() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: characters, isLoading } = useListCharacters({ search: search || undefined, tags: selectedTags.join(",") || undefined });
  const { data: tags } = useListTags();

  const toggleTag = (name: string) => {
    setSelectedTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Rajdhani, serif" }}>Discover</h1>
        <p className="text-muted-foreground">Find characters to roleplay with</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="search"
          placeholder="Search characters..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/30 transition-all"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        />
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                background: selectedTags.includes(tag.name) ? "rgba(255,0,170,0.3)" : "rgba(255,0,170,0.08)",
                border: selectedTags.includes(tag.name) ? "1px solid rgba(255,0,170,0.8)" : "1px solid rgba(255,0,170,0.25)",
                color: selectedTags.includes(tag.name) ? "#ff00aa" : "rgba(255,255,255,0.7)",
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* My Characters button */}
      <div className="flex justify-end mb-6">
        <button onClick={() => setLocation("/characters/new")} className="px-6 py-2 rounded-full font-semibold text-sm transition-all" style={{
          background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
          boxShadow: "0 0 20px rgba(255,0,170,0.3)",
          color: "white",
        }}>
          + Create Character
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl h-64 animate-pulse" style={{ background: "rgba(255,0,170,0.08)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters?.map(char => (
            <div key={char.id} onClick={() => setLocation(`/characters/${char.id}`)} className="rounded-2xl p-4 cursor-pointer hover:scale-105 transition-all duration-300 group" style={{
              background: "rgba(20,0,40,0.6)",
              border: "1px solid rgba(255,0,170,0.2)",
              backdropFilter: "blur(16px)",
            }}>
              <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden" style={{ background: "rgba(255,0,170,0.08)" }}>
                {char.profilePicture ? (
                  <img src={char.profilePicture} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/40" style={{ fontFamily: "Rajdhani, serif" }}>
                    {char.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-bold truncate group-hover:text-primary transition-colors">{char.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{char.description}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-primary/70">{char.chatCount} chats</div>
                <div className="text-xs text-muted-foreground">Age {char.age}</div>
              </div>
              {char.tags && char.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {char.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,0,170,0.1)", color: "rgba(255,0,170,0.8)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!characters || characters.length === 0) && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              No characters found. Be the first to create one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
