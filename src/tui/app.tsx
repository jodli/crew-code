import { useState, useReducer, useCallback } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";
import { JsonFileConfigStore } from "../adapters/json-file-config-store.ts";
import { useTeams } from "./hooks/use-teams.ts";
import { useAgents } from "./hooks/use-agents.ts";
import { navReducer, initialNavState } from "./views/navigation.ts";
import { TeamListPanel } from "./components/team-list-panel.tsx";
import { AgentListPanel } from "./components/agent-list-panel.tsx";
import { ShortcutBar } from "./components/shortcut-bar.tsx";
import { HelpOverlay } from "./components/help-overlay.tsx";
import { CreateTeamForm } from "./components/create-team-form.tsx";
import type { Launcher } from "./launcher/port.ts";

const configStore = new JsonFileConfigStore();

interface AppProps {
  launcher: Launcher;
}

export function App({ launcher }: AppProps) {
  const { width, height } = useTerminalDimensions();
  const teams = useTeams(configStore);
  const [nav, dispatch] = useReducer(navReducer, initialNavState);
  const [exiting, setExiting] = useState(false);

  const selectedTeamName = nav !== "quit" && teams[nav.teamIndex]
    ? teams[nav.teamIndex].name
    : null;

  const agents = useAgents(configStore, selectedTeamName);

  const isOverlay = nav !== "quit" && nav.view.screen !== "dashboard";

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (exiting || nav === "quit") return;

      // When an overlay with its own keyboard handling is active, only handle Esc globally
      if (nav.view.screen === "create-team") return;

      // Global keys
      if (key.name === "q" && !key.ctrl) {
        const result = navReducer(nav, { type: "quit" });
        if (result === "quit") {
          setExiting(true);
          process.exit(0);
        }
        return;
      }

      if (key.name === "?" || (key.shift && key.name === "/")) {
        dispatch({ type: "toggle_help" });
        return;
      }

      if (key.name === "escape") {
        dispatch({ type: "close_overlay" });
        return;
      }

      if (key.name === "tab") {
        dispatch({ type: "switch_panel" });
        return;
      }

      // Dashboard navigation
      if (nav.view.screen === "dashboard") {
        if (key.name === "up" || key.name === "k") {
          dispatch({ type: "move_up" });
        } else if (key.name === "down" || key.name === "j") {
          const maxIndex = nav.panel === "teams"
            ? Math.max(0, teams.length - 1)
            : Math.max(0, agents.length - 1);
          dispatch({ type: "move_down", maxIndex });
        } else if ((key.name === "return" || key.name === "l") && nav.panel === "teams") {
          dispatch({ type: "focus_agents" });
        } else if (key.name === "h" && nav.panel === "agents") {
          dispatch({ type: "focus_teams" });
        } else if (key.name === "n" && nav.panel === "teams") {
          dispatch({ type: "open_create_team" });
        }
      }
    },
    [nav, teams.length, agents.length, exiting],
  );

  useKeyboard(handleKey);

  const handleCreateTeam = useCallback(
    async (name: string, cwd: string) => {
      await launcher.openTerminal(["crew", "create", "--name", name], cwd, `crew:${name}`);
      dispatch({ type: "close_overlay" });
    },
    [launcher],
  );

  const handleCancelOverlay = useCallback(() => {
    dispatch({ type: "close_overlay" });
  }, []);

  if (nav === "quit" || exiting) {
    return <text content="Goodbye!" />;
  }

  return (
    <box width={width} height={height} flexDirection="column">
      {/* Header */}
      <box height={1} paddingX={1} flexDirection="row" justifyContent="space-between">
        <text content="crew tui" fg="#7aa2f7" />
        <text content={launcher.name} fg="#565f89" />
      </box>

      {/* Main content — two panels side by side */}
      <box flexGrow={1} flexDirection="row">
        <TeamListPanel
          teams={teams}
          selectedIndex={nav.teamIndex}
          focused={nav.panel === "teams" && !isOverlay}
        />
        <AgentListPanel
          agents={agents}
          selectedIndex={nav.agentIndex}
          focused={nav.panel === "agents" && !isOverlay}
          teamName={selectedTeamName}
        />
      </box>

      {/* Shortcut bar */}
      <ShortcutBar panel={nav.panel} />

      {/* Overlays */}
      {nav.view.screen === "help" && <HelpOverlay />}
      {nav.view.screen === "create-team" && (
        <CreateTeamForm
          defaultCwd={process.cwd()}
          onSubmit={handleCreateTeam}
          onCancel={handleCancelOverlay}
        />
      )}
    </box>
  );
}
