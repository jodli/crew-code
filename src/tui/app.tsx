import { useState, useReducer, useCallback } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";
import { JsonFileConfigStore } from "../adapters/json-file-config-store.ts";
import { useTeams } from "./hooks/use-teams.ts";
import { navReducer, initialNavState } from "./views/navigation.ts";
import { TeamListPanel } from "./components/team-list-panel.tsx";
import { ShortcutBar } from "./components/shortcut-bar.tsx";
import { HelpOverlay } from "./components/help-overlay.tsx";

const configStore = new JsonFileConfigStore();

export function App() {
  const { width, height } = useTerminalDimensions();
  const teams = useTeams(configStore);
  const [nav, dispatch] = useReducer(navReducer, initialNavState);
  const [exiting, setExiting] = useState(false);

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (exiting) return;
      if (nav === "quit") return;

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

      // Dashboard navigation
      if (nav.view.screen === "dashboard") {
        if (key.name === "up" || key.name === "k") {
          dispatch({ type: "move_up" });
        } else if (key.name === "down" || key.name === "j") {
          dispatch({ type: "move_down", maxIndex: Math.max(0, teams.length - 1) });
        }
      }
    },
    [nav, teams.length, exiting],
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

      {/* Main content */}
      <box flexGrow={1} flexDirection="row">
        <TeamListPanel
          teams={teams}
          selectedIndex={nav.selectedIndex}
          focused={nav.panel === "teams"}
        />
      </box>

      {/* Shortcut bar */}
      <ShortcutBar panel={nav.panel} />

      {/* Overlays */}
      {nav.view.screen === "help" && <HelpOverlay />}
    </box>
  );
}
