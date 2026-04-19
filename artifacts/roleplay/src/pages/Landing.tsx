import { useLocation } from "wouter";
import { useGetFeaturedCharacters } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Landing() {
  const [, setLocation] = useLocation();
  const { data: featured } = useGetFeaturedCharacters();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,0,170,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,170,0.04) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        zIndex: 0,
      }} />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center py-24">
        <div className="mb-6">
          <span className="px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase border border-primary/40 text-primary bg-primary/10 backdrop-blur">
            AI Roleplay Platform
          </span>
        </div>
        <h1 className="text-7xl md:text-9xl font-bold mb-6 leading-none" style={{
          fontFamily: "Rajdhani, serif",
          background: "linear-gradient(135deg, #ff00aa 0%, #ff6ef7 50%, #9b59ff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 40px rgba(255,0,170,0.5))",
        }}>
          LoreWeave
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-4 leading-relaxed">
          Where stories come alive. Create, discover, and immerse yourself with AI characters in deep, limitless roleplay.
        </p>
        <p className="text-sm text-muted-foreground/60 mb-12 max-w-lg">
          Build your persona. Craft your characters. Begin your story.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => setLocation(`${basePath}/sign-up`)} className="px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 cursor-pointer" style={{
            background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
            boxShadow: "0 0 30px rgba(255,0,170,0.5), 0 0 60px rgba(155,89,255,0.3)",
            color: "white",
          }}>
            Begin Your Journey
          </button>
          <button onClick={() => setLocation(`${basePath}/sign-in`)} className="px-10 py-4 rounded-full font-bold text-lg border border-primary/50 text-primary backdrop-blur bg-primary/5 hover:bg-primary/10 transition-all duration-300 cursor-pointer">
            Sign In
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 flex flex-wrap justify-center gap-12">
          {[["Immersive", "Stories"], ["Unlimited", "Characters"], ["Real-time", "AI Roleplay"]].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-primary mb-1" style={{ fontFamily: "Rajdhani, serif" }}>{num}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Characters */}
      {featured && featured.length > 0 && (
        <section className="relative z-10 px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "Rajdhani, serif" }}>Meet the Characters</h2>
            <p className="text-muted-foreground text-center mb-10">Discover worlds waiting to be explored</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featured.slice(0, 8).map((char) => (
                <div key={char.id} onClick={() => setLocation(`/characters/${char.id}`)} className="glass-panel p-4 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 group" style={{
                  background: "rgba(30,0,60,0.5)",
                  border: "1px solid rgba(255,0,170,0.25)",
                  backdropFilter: "blur(16px)",
                }}>
                  <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden" style={{ background: "rgba(255,0,170,0.1)" }}>
                    {char.profilePicture ? (
                      <img src={char.profilePicture} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary/50" style={{ fontFamily: "Rajdhani, serif" }}>
                        {char.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{char.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{char.description}</p>
                  <div className="mt-2 text-xs text-primary/70">{char.chatCount} chats</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <button onClick={() => setLocation("/discover")} className="px-8 py-3 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-all">
                View All Characters
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
