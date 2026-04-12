import { useState } from "react";
import { useLocation } from "wouter";
import { useSearchPersonas, useListPersonas } from "@workspace/api-client-react";

export default function People() {
  const [, setLocation] = useLocation();
  const [q, setQ] = useState("");
  const { data: personas, isLoading } = useSearchPersonas({ q: q || undefined });
  const { data: myPersonas } = useListPersonas();

  const mainPersona = myPersonas?.find(p => p.isMain) || myPersonas?.[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-1" style={{ fontFamily: "Rajdhani, serif" }}>People</h1>
        <p className="text-muted-foreground">Discover other users' personas and connect</p>
      </div>

      <div className="relative mb-8">
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search personas..."
          className="w-full px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 focus:outline-none focus:border-primary/60 transition-all"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,0,170,0.06)" }} />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {personas?.map(persona => (
            <div key={persona.id} className="p-5 rounded-2xl" style={{ background: "rgba(15,0,35,0.6)", border: "1px solid rgba(255,0,170,0.15)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-3 mb-3">
                {persona.avatarUrl ? (
                  <img src={persona.avatarUrl} alt={persona.name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-primary/30" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-primary/50" style={{ background: "rgba(255,0,170,0.08)", fontFamily: "Rajdhani, serif" }}>
                    {persona.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold">{persona.name}</div>
                  <div className="text-xs text-muted-foreground">Age {persona.age}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{persona.description}</p>
              {mainPersona && mainPersona.id !== persona.id && (
                <button
                  onClick={() => setLocation(`/messages/${persona.id}`)}
                  className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, rgba(255,0,170,0.3), rgba(155,89,255,0.2))", border: "1px solid rgba(255,0,170,0.4)", color: "#ff00aa" }}
                >
                  Send Message
                </button>
              )}
            </div>
          ))}
          {(!personas || personas.length === 0) && (
            <div className="col-span-full text-center py-16 text-muted-foreground">No personas found.</div>
          )}
        </div>
      )}
    </div>
  );
}
