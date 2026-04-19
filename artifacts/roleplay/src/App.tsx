import React, { useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "./pages/Landing";
import Discover from "./pages/Discover";
import CharacterDetail from "./pages/CharacterDetail";
import CreateCharacter from "./pages/CreateCharacter";
import ChatsList from "./pages/ChatsList";
import ChatRoom from "./pages/ChatRoom";
import Personas from "./pages/Personas";
import AdminDashboard from "./pages/AdminDashboard";
import { GroupsList, GroupRoom } from "./pages/Groups";
import People from "./pages/People";
import { MessagesList, DmRoom } from "./pages/Messages";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage, SignUpPage } from "./pages/AuthPages";
import { Link } from "wouter";
import { Button } from "./components/ui/button";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("React Error Boundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-black min-h-screen">
          <h1 className="text-3xl font-bold mb-4 border-b border-red-900 pb-2">Application Crash Detected</h1>
          <p className="mb-4 text-red-400">Technical Details:</p>
          <pre className="text-sm bg-red-950/20 p-4 overflow-auto rounded border border-red-900 text-red-200 mb-4">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase"
          >
            Attempt Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const navLinks = [
  { label: "Discover", path: "/discover" },
  { label: "My Chats", path: "/chats" },
  { label: "Groups", path: "/groups" },
  { label: "Personas", path: "/personas" },
  { label: "People", path: "/people" },
  { label: "Messages", path: "/messages" },
  { label: "Admin", path: "/admin" },
];

function NavBar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.email === "keyamuha@gmail.com";

  return (
    <header
      className="h-16 flex items-center px-6 justify-between sticky top-0 z-50"
      style={{
        background: "rgba(5,0,18,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,0,170,0.2)",
        boxShadow: "0 1px 20px rgba(255,0,170,0.08)",
      }}
    >
      <div
        className="text-2xl font-bold cursor-pointer select-none"
        style={{
          fontFamily: "Rajdhani, serif",
          background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
        onClick={() => setLocation("/")}
      >
        LoreWeave
      </div>

      {user && (
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.filter(l => l.path !== "/admin" || isAdmin).map((link) => (
            <button
              key={link.path}
              onClick={() => setLocation(link.path)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                color: location === link.path ? "#ff00aa" : "rgba(255,255,255,0.6)",
                background: location === link.path ? "rgba(255,0,170,0.12)" : "transparent",
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "rgba(255,0,170,0.08)", border: "1px solid rgba(255,0,170,0.2)" }}
            >
              <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold ring-1 ring-pink-500/50">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm hidden sm:block">{user.username}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden p-1 shadow-2xl" style={{
                background: "rgba(10,0,28,0.95)",
                border: "1px solid rgba(255,0,170,0.3)",
                backdropFilter: "blur(16px)",
              }}>
                <button
                  onClick={() => { setLocation("/personas"); setMenuOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-pink-500/10 rounded-lg transition-colors"
                >
                  My Personas
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setLocation("/admin"); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-pink-500/10 rounded-lg transition-colors"
                  >
                    Admin Dashboard
                  </button>
                )}
                <div className="h-px my-1 bg-pink-500/10" />
                <button
                  onClick={() => logout()}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                >
                  Terminate Session
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-pink-400 border-pink-500/20">Login</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500">Initialize</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.email !== "keyamuha@gmail.com") return <Redirect to="/discover" />;
  return <>{children}</>;
}

function Home() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/discover" />;
  return <Landing />;
}

function AppContent() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/discover" component={Discover} />
          <Route path="/characters/new">
            <RequireAuth><CreateCharacter /></RequireAuth>
          </Route>
          <Route path="/characters/:id/edit">
            {(params) => <RequireAuth><CreateCharacter editMode characterId={Number(params.id)} /></RequireAuth>}
          </Route>
          <Route path="/characters/:id" component={CharacterDetail} />
          <Route path="/chats/:id">
            <RequireAuth><ChatRoom /></RequireAuth>
          </Route>
          <Route path="/chats">
            <RequireAuth><ChatsList /></RequireAuth>
          </Route>
          <Route path="/groups/:id">
            <RequireAuth><GroupRoom /></RequireAuth>
          </Route>
          <Route path="/groups">
            <RequireAuth><GroupsList /></RequireAuth>
          </Route>
          <Route path="/personas">
            <RequireAuth><Personas /></RequireAuth>
          </Route>
          <Route path="/people" component={People} />
          <Route path="/messages/:personaId">
            <RequireAuth><DmRoom /></RequireAuth>
          </Route>
          <Route path="/messages">
            <RequireAuth><MessagesList /></RequireAuth>
          </Route>
          <Route path="/admin">
            <RequireAdmin><AdminDashboard /></RequireAdmin>
          </Route>
          <Route path="/sign-in" component={LoginPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter>
              <AppContent />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
