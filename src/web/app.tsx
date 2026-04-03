import { useState, useCallback } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { BlueprintsListPage } from "./pages/blueprints-list.tsx";
import { BlueprintEditorPage } from "./pages/blueprint-editor.tsx";
import { CrewsListPage } from "./pages/crews-list.tsx";
import { CrewDetailPage } from "./pages/crew-detail.tsx";
import { ToastProvider } from "./components/shared/toast.tsx";
import { createQueryClient } from "./lib/query-client.ts";
import { getStoredTheme, setTheme, type Theme } from "./lib/theme.ts";

const queryClient = createQueryClient();

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];
const THEME_ICONS: Record<Theme, string> = { light: "\u2600", dark: "\u263E", system: "\u25D1" };
const THEME_LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

type ConnectionState = "connected" | "reconnecting" | "disconnected";

export function App() {
  const [location] = useLocation();
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  // Mock: cycle through connection states on click for prototype demo
  const [connState, setConnState] = useState<ConnectionState>("connected");

  const cycleTheme = useCallback(() => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
    setThemeState(next);
  }, [theme]);

  const cycleConn = () => {
    const states: ConnectionState[] = ["connected", "reconnecting", "disconnected"];
    setConnState(states[(states.indexOf(connState) + 1) % states.length]);
  };

  return (
    <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <div className="h-full flex flex-col">
        {/* Disconnect banner */}
        {connState === "disconnected" && (
          <div className="bg-error/10 border-b border-error/20 px-6 py-1.5 text-xs text-error/80 text-center shrink-0">
            Server disconnected &mdash; retrying...
          </div>
        )}

        <nav className="flex items-center gap-6 px-6 h-12 shrink-0 border-b border-border">
          <span className="text-base font-semibold tracking-[-0.04em] text-text select-none">crew</span>

          <div className="flex items-center gap-1">
            <NavLink href="/" active={location === "/" || location.startsWith("/blueprints")}>
              Blueprints
            </NavLink>
            <NavLink href="/crews" active={location.startsWith("/crews")}>
              Crews
            </NavLink>
          </div>

          <div className="flex-1" />

          <button
            onClick={cycleTheme}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded"
            title={`Theme: ${THEME_LABELS[theme]}`}
          >
            <span className="text-sm leading-none">{THEME_ICONS[theme]}</span>
            <span>{THEME_LABELS[theme]}</span>
          </button>

          {/* Connection indicator — click to cycle states (prototype demo) */}
          <button
            onClick={cycleConn}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            title="Click to cycle connection states (prototype demo)"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connState === "connected"
                  ? "bg-success"
                  : connState === "reconnecting"
                    ? "bg-warning animate-pulse"
                    : "bg-error"
              }`}
            />
            <span>
              {connState === "connected"
                ? "localhost:3117"
                : connState === "reconnecting"
                  ? "reconnecting..."
                  : "disconnected"}
            </span>
          </button>
        </nav>

        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={BlueprintsListPage} />
            <Route path="/blueprints" component={BlueprintsListPage} />
            <Route path="/blueprints/new" component={BlueprintEditorPage} />
            <Route path="/blueprints/:name" component={BlueprintEditorPage} />
            <Route path="/crews" component={CrewsListPage} />
            <Route path="/crews/:name" component={CrewDetailPage} />
            <Route>
              <div className="max-w-4xl mx-auto px-6 py-16 text-center">
                <h1 className="text-2xl font-bold text-text mb-2">404</h1>
                <p className="text-sm text-text-muted mb-4">This page doesn't exist.</p>
                <a href="/" className="text-sm text-accent hover:text-accent-hover transition-colors">
                  Go to Blueprints
                </a>
              </div>
            </Route>
          </Switch>
        </main>
      </div>
    </ToastProvider>
    </QueryClientProvider>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-2.5 py-1 rounded text-sm transition-colors duration-100 ${
        active
          ? "text-text bg-bg-active font-medium"
          : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </a>
  );
}
