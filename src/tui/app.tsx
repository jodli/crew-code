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

const configStore = new JsonFileConfigStore();

export function App() {
  const { width, height } = useTerminalDimensions();
  const teams = useTeams(configStore);
  const [nav, dispatch] = useReducer(navReducer, initialNavState);
  const [exiting, setExiting] = useState(false);

  const selectedTeamName = nav !== "quit" && teams[nav.teamIndex]
    ? teams[nav.teamIndex].name
    : null;

  const agents = useAgents(configStore, selectedTeamName);

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (exiting || nav === "quit") return;

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
        }
      }
    },
    [nav, teams.length, agents.length, exiting],
  );

  useKeyboard(handleKey);

  if (nav === "quit" || exiting) {
    return <text content="Goodbye!" />;
  }

  return (
    <box width={width} height={height} flexDirection="column">
      {/* Header */}
      <box height={1} paddingX={1}>
        <text content="crew tui" fg="#7aa2f7" />
      </box>

      {/* Main content — two panels side by side */}
      <box flexGrow={1} flexDirection="row">
        <TeamListPanel
          teams={teams}
          selectedIndex={nav.teamIndex}
          focused={nav.panel === "teams"}
        />
        <AgentListPanel
          agents={agents}
          selectedIndex={nav.agentIndex}
          focused={nav.panel === "agents"}
          teamName={selectedTeamName}
        />
      </box>

      {/* Shortcut bar */}
      <ShortcutBar panel={nav.panel} />

      {/* Overlays */}
      {nav.view.screen === "help" && <HelpOverlay />}
    </box>
  );
}
