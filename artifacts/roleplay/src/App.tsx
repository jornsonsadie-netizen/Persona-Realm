import React, { useEffect, useRef, useState } from "react";
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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
const clerkProxyUrlEnv = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
const isProd = import.meta.env.PROD;
const usesTestKey = clerkPubKey.startsWith("pk_test");
const clerkProxyUrl = (clerkProxyUrlEnv && clerkProxyUrlEnv !== "" && clerkProxyUrlEnv !== "undefined") 
  ? clerkProxyUrlEnv 
  : (isProd && !usesTestKey ? `${window.location.origin}/api/__clerk` : undefined);
const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const queryClient = new QueryClient();

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Removed top-level throw to prevent module-load "dark screen" crashes
// This check is now performed safely inside the App component within the ErrorBoundary

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
          <p className="mb-4 text-red-400">Please provide the technical details below to support:</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-red-700 font-bold mb-1">Error Message</p>
              <pre className="text-sm bg-red-950/20 p-4 overflow-auto rounded border border-red-900 text-red-200">{this.state.error?.toString()}</pre>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-red-700 font-bold mb-1">Stack Trace</p>
              <pre className="text-xs bg-red-950/20 p-4 overflow-auto rounded border border-red-900 text-red-300 antialiased font-mono">{this.state.error?.stack}</pre>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-500 transition-colors text-white rounded font-bold uppercase tracking-wider text-sm"
          >
            Attempt Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 6000); // 6 second hang detection
    return () => clearTimeout(timer);
  }, []);

  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-red-900 border-t-red-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-red-500 mb-2">Connection is taking longer than usual</h2>
        <p className="text-gray-400 max-w-md mb-6">We are having trouble connecting to the authentication service. This usually happens on slow mobile connections or due to ad-blockers.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button 
            onClick={() => {
              const start = Date.now();
              fetch(`${clerkProxyUrl || ""}/v1/client`)
                .then(async (r) => {
                  const body = !r.ok ? await r.text() : "Success";
                  alert(`Proxy Status: ${r.status} (${Date.now() - start}ms)\nDetails: ${body.slice(0, 100)}`);
                })
                .catch(e => alert(`Proxy Error: ${e.message}`));
            }} 
            className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500"
          >
            Test Proxy Link
          </button>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-500">Retry App Connection</button>
          <button onClick={() => setLoadingTimeout(false)} className="px-6 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-700">Go Back</button>
        </div>
        <div className="mt-8 text-xs text-gray-600 font-mono text-left bg-gray-900/50 p-4 rounded border border-gray-800">
          <p className="text-blue-400 font-bold mb-2">Clerk Instance: rapid-moth-56</p>
          <p>Key: {clerkPubKey.slice(0, 10)}...</p>
          {clerkPubKey.startsWith("pk_test") && (
            <p className="text-red-500 font-bold mt-1">⚠️ CRITICAL: YOU ARE USING A TEST KEY IN PRODUCTION</p>
          )}
          <p>Proxy: {clerkProxyUrl || "None"}</p>
          <p>Base: {basePath || "Root"}</p>
        </div>
      </div>
    );
  }

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
  if (!clerkPubKey) {
    return (
      <div className="p-8 text-red-500 bg-black min-h-screen font-mono">
        <h1 className="text-2xl font-bold mb-4">CRITICAL CONFIGURATION ERROR</h1>
        <p className="mb-2">The <code className="bg-red-950 px-1">VITE_CLERK_PUBLISHABLE_KEY</code> is missing from your production environment.</p>
        <p className="text-sm opacity-70">Please add your Clerk Publishable Key to your Vercel Environment Variables and redeploy.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <WouterRouter>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
