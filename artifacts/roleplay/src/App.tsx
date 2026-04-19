import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const queryClient = new QueryClient();

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function SignInPage() {
  return (
    <div className="flex w-full justify-center mt-24 mb-16 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl="/discover" />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex w-full justify-center mt-24 mb-16 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl="/discover" />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // addListener signature changed in Clerk v6 — guard against it returning void
    const result = (clerk as any).addListener?.(({ user }: any) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return typeof result === "function" ? result : undefined;
  }, [clerk, queryClient]);

  return null;
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
  const { user } = useUser();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "keyamuha@gmail.com";

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
      {/* Logo */}
      <div
        className="text-2xl font-bold cursor-pointer select-none"
        style={{
          fontFamily: "Rajdhani, serif",
          background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 12px rgba(255,0,170,0.5))",
        }}
        onClick={() => setLocation("/")}
      >
        LoreWeave
      </div>

      {/* Desktop Nav */}
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
                border: location === link.path ? "1px solid rgba(255,0,170,0.35)" : "1px solid transparent",
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
              style={{ background: "rgba(255,0,170,0.08)", border: "1px solid rgba(255,0,170,0.2)" }}
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-6 h-6 rounded-full ring-1 ring-primary/50" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold">
                  {user?.firstName?.charAt(0) || "U"}
                </div>
              )}
              <span className="text-sm hidden sm:block">{user?.firstName || "Me"}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl overflow-hidden" style={{
                background: "rgba(10,0,28,0.95)",
                border: "1px solid rgba(255,0,170,0.3)",
                backdropFilter: "blur(16px)",
              }}>
                <button
                  onClick={() => { setLocation("/personas"); setMenuOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary/10 transition-colors"
                >
                  My Personas
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setLocation("/admin"); setMenuOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary/10 transition-colors"
                  >
                    Admin
                  </button>
                )}
                <div className="h-px my-1" style={{ background: "rgba(255,0,170,0.2)" }} />
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/10 transition-colors text-red-400"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setLocation(`${basePath}/sign-in`)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #ff00aa, #9b59ff)",
              color: "white",
              boxShadow: "0 0 15px rgba(255,0,170,0.3)",
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [location] = useLocation();
  if (!isLoaded) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || email !== "keyamuha@gmail.com") return <Redirect to="/discover" />;
  return <>{children}</>;
}

function Home() {
  const { user } = useUser();
  if (user) return <Redirect to="/discover" />;
  return <Landing />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
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

              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
