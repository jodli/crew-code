import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { DisconnectedBanner } from "./components/shared/error-banner.tsx";
import { ToastProvider } from "./components/shared/toast.tsx";
import { createQueryClient } from "./lib/query-client.ts";
import { getStoredTheme, setTheme, type Theme } from "./lib/theme.ts";
import type { ConnectionStatus } from "./lib/use-health-check.ts";
import { useHealthCheck } from "./lib/use-health-check.ts";
import { BlueprintEditorPage } from "./pages/blueprint-editor.tsx";
import { BlueprintsListPage } from "./pages/blueprints-list.tsx";
import { CrewDetailPage } from "./pages/crew-detail.tsx";
import { CrewsListPage } from "./pages/crews-list.tsx";

const ConnectionContext = createContext<ConnectionStatus>("connected");
export function useConnection() {
  return useContext(ConnectionContext);
}

const queryClient = createQueryClient();

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];
const THEME_ICONS: Record<Theme, string> = { light: "\u2600", dark: "\u263E", system: "\u25D1" };
const THEME_LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const [location] = useLocation();
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const { status: connState } = useHealthCheck();
  const qc = useQueryClient();

  // Bug 10: invalidate all queries when connection recovers
  const prevStatus = useRef(connState);
  useEffect(() => {
    if (prevStatus.current !== "connected" && connState === "connected") {
      qc.invalidateQueries();
    }
    prevStatus.current = connState;
  }, [connState, qc]);

  const cycleTheme = useCallback(() => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
    setThemeState(next);
  }, [theme]);

  return (
    <ConnectionContext.Provider value={connState}>
      <div className="h-full flex flex-col">
        {connState === "disconnected" && <DisconnectedBanner />}

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
            type="button"
            onClick={cycleTheme}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded"
            title={`Theme: ${THEME_LABELS[theme]}`}
          >
            <span className="text-sm leading-none">{THEME_ICONS[theme]}</span>
            <span>{THEME_LABELS[theme]}</span>
          </button>

          {/* Connection indicator */}
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
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
          </span>
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
    </ConnectionContext.Provider>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-2.5 py-1 rounded text-sm transition-colors duration-100 ${
        active ? "text-text bg-bg-active font-medium" : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {children}
    </a>
  );
}
