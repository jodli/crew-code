import { useState, useReducer, useCallback, useEffect } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { KeyEvent } from "@opentui/core";
import { JsonFileConfigStore } from "../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../adapters/json-file-inbox-store.ts";
import { useTeams } from "./hooks/use-teams.ts";
import { useAgents } from "./hooks/use-agents.ts";
import { navReducer, initialNavState } from "./views/navigation.ts";
import { TeamListPanel } from "./components/team-list-panel.tsx";
import { AgentListPanel } from "./components/agent-list-panel.tsx";
import { ShortcutBar } from "./components/shortcut-bar.tsx";
import { HelpOverlay } from "./components/help-overlay.tsx";
import { CreateTeamForm } from "./components/create-team-form.tsx";
import { SpawnAgentForm } from "./components/spawn-agent-form.tsx";
import { ConfirmBar } from "./components/confirm-bar.tsx";
import { ErrorToast } from "./components/error-toast.tsx";
import { InboxView } from "./components/inbox-view.tsx";
import { SendMessageForm } from "./components/send-message-form.tsx";
import type { Launcher } from "./launcher/port.ts";
import { buildCreateCommand, buildSpawnCommand, buildAttachCommand } from "./launcher/commands.ts";
import { killAgent } from "../actions/kill-agent.ts";
import { destroyTeam } from "../actions/destroy-team.ts";
import { removeAgent } from "../actions/remove-agent.ts";
import { sendMessage } from "../actions/send-message.ts";

const configStore = new JsonFileConfigStore();
const inboxStore = new JsonFileInboxStore();
const ctx = { configStore, inboxStore };

interface AppProps {
  launcher: Launcher;
}

export function App({ launcher }: AppProps) {
  const { width, height } = useTerminalDimensions();
  const teams = useTeams(configStore);
  const [nav, dispatch] = useReducer(navReducer, initialNavState);
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState("");

  // Clamp teamIndex when teams list shrinks (e.g. after destroy)
  useEffect(() => {
    if (nav === "quit") return;
    if (teams.length > 0 && nav.teamIndex >= teams.length) {
      dispatch({ type: "move_up" });
    }
  }, [teams.length, nav]);

  const selectedTeamName = nav !== "quit" && teams[nav.teamIndex]
    ? teams[nav.teamIndex].name
    : null;

  const agents = useAgents(configStore, inboxStore, selectedTeamName);

  // Clamp agentIndex when agents list shrinks
  useEffect(() => {
    if (nav === "quit") return;
    if (agents.length > 0 && nav.agentIndex >= agents.length) {
      dispatch({ type: "move_up" });
    }
  }, [agents.length, nav]);

  const selectedAgent = nav !== "quit" ? agents[nav.agentIndex] ?? null : null;

  const isOverlay = nav !== "quit" && nav.view.screen !== "dashboard";
  const isConfirm = nav !== "quit" && (nav.view.screen === "confirm-kill" || nav.view.screen === "confirm-destroy" || nav.view.screen === "confirm-remove");
  // Views that handle all their own keyboard input
  const isDelegatedView = nav !== "quit" && (
    nav.view.screen === "create-team" ||
    nav.view.screen === "spawn-agent" ||
    nav.view.screen === "send-message" ||
    nav.view.screen === "inbox"
  );

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (exiting || nav === "quit") return;
      if (isDelegatedView) return;
      if (isConfirm) return;

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
        } else if (key.name === "s" && nav.panel === "agents" && selectedTeamName) {
          dispatch({ type: "open_spawn_agent" });
        } else if ((key.name === "a" || key.name === "return") && nav.panel === "agents") {
          if (selectedAgent && selectedTeamName) {
            const args = buildAttachCommand(selectedTeamName, selectedAgent.name);
            launcher.openTerminal(args, selectedAgent.cwd, `crew:${selectedAgent.name}`).catch((e) => {
              setError(`Failed to attach: ${e.message}`);
            });
          }
        } else if (key.name === "x" && nav.panel === "agents" && selectedAgent) {
          dispatch({ type: "open_confirm_kill" });
        } else if (key.name === "r" && nav.panel === "agents" && selectedAgent) {
          dispatch({ type: "open_confirm_remove" });
        } else if (key.name === "d" && nav.panel === "teams" && selectedTeamName) {
          dispatch({ type: "open_confirm_destroy" });
        } else if (key.name === "i" && nav.panel === "agents" && selectedAgent) {
          dispatch({ type: "open_inbox" });
        } else if (key.name === "m" && nav.panel === "agents" && selectedAgent && selectedTeamName) {
          dispatch({ type: "open_send_message" });
        }
      }
    },
    [nav, teams.length, agents.length, exiting, isDelegatedView, isConfirm, selectedTeamName, selectedAgent],
  );

  useKeyboard(handleKey);

  const handleCreateTeam = useCallback(
    async (name: string, cwd: string) => {
      try {
        await launcher.openTerminal(buildCreateCommand(name), cwd, `crew:${name}`);
      } catch (e: any) {
        setError(`Failed to create: ${e.message}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [launcher],
  );

  const handleSpawnAgent = useCallback(
    async (opts: { name: string; task: string; model: string; cwd: string }) => {
      if (!selectedTeamName) return;
      const args = buildSpawnCommand(selectedTeamName, opts);
      try {
        await launcher.openTerminal(args, opts.cwd, `crew:${opts.name || "agent"}`);
      } catch (e: any) {
        setError(`Failed to spawn: ${e.message}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [launcher, selectedTeamName],
  );

  const handleConfirmKill = useCallback(() => {
    if (nav === "quit") return;
    const agent = agents[nav.agentIndex];
    if (agent) {
      killAgent(agent.processId);
    }
    dispatch({ type: "close_overlay" });
  }, [nav, agents]);

  const handleConfirmDestroy = useCallback(async () => {
    if (!selectedTeamName) return;
    const result = await destroyTeam(ctx, { team: selectedTeamName });
    if (!result.ok) {
      setError(`Destroy failed: ${result.error.kind}`);
    }
    dispatch({ type: "close_overlay" });
  }, [selectedTeamName]);

  const handleConfirmRemove = useCallback(async () => {
    if (!selectedTeamName || !selectedAgent) return;
    const result = await removeAgent(ctx, { team: selectedTeamName, name: selectedAgent.name });
    if (!result.ok) {
      setError(`Remove failed: ${result.error.kind}`);
    }
    dispatch({ type: "close_overlay" });
  }, [selectedTeamName, selectedAgent]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedTeamName || !selectedAgent) return;
      const result = await sendMessage(ctx, {
        team: selectedTeamName,
        agent: selectedAgent.name,
        message,
        from: "tui",
      });
      if (!result.ok) {
        setError(`Send failed: ${result.error.kind}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [selectedTeamName, selectedAgent],
  );

  const handleCancelOverlay = useCallback(() => {
    dispatch({ type: "close_overlay" });
  }, []);

  const handleDismissError = useCallback(() => {
    setError("");
  }, []);

  if (nav === "quit" || exiting) {
    return <text content="Goodbye!" />;
  }

  // Inbox view replaces the dashboard entirely
  if (nav.view.screen === "inbox" && selectedTeamName && selectedAgent) {
    return (
      <box width={width} height={height} flexDirection="column">
        <InboxView
          inboxStore={inboxStore}
          teamName={selectedTeamName}
          agentName={selectedAgent.name}
          onClose={handleCancelOverlay}
          onSend={() => dispatch({ type: "open_send_message" })}
        />
        {nav.view.screen === "inbox" && error && (
          <ErrorToast message={error} onDismiss={handleDismissError} />
        )}
      </box>
    );
  }

  // Build confirm messages
  const killMessage = selectedAgent
    ? `Kill agent "${selectedAgent.name}"?`
    : "";
  const destroyMessage = selectedTeamName
    ? `Destroy team "${selectedTeamName}"? Kills ${agents.filter(a => a.status === "alive").length} agent(s).`
    : "";
  const removeMessage = selectedAgent
    ? selectedAgent.status === "alive"
      ? `Remove "${selectedAgent.name}"? Kills process, deletes inbox, removes from config.`
      : `Remove "${selectedAgent.name}"? Deletes inbox, removes from config.`
    : "";

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

      {/* Bottom bar — either shortcut bar or confirm bar */}
      {nav.view.screen === "confirm-kill" ? (
        <ConfirmBar
          message={killMessage}
          onConfirm={handleConfirmKill}
          onCancel={handleCancelOverlay}
        />
      ) : nav.view.screen === "confirm-destroy" ? (
        <ConfirmBar
          message={destroyMessage}
          onConfirm={handleConfirmDestroy}
          onCancel={handleCancelOverlay}
        />
      ) : nav.view.screen === "confirm-remove" ? (
        <ConfirmBar
          message={removeMessage}
          onConfirm={handleConfirmRemove}
          onCancel={handleCancelOverlay}
        />
      ) : (
        <ShortcutBar panel={nav.panel} />
      )}

      {/* Overlays */}
      {nav.view.screen === "help" && <HelpOverlay />}
      {nav.view.screen === "create-team" && (
        <CreateTeamForm
          defaultCwd={process.cwd()}
          onSubmit={handleCreateTeam}
          onCancel={handleCancelOverlay}
        />
      )}
      {nav.view.screen === "spawn-agent" && selectedTeamName && (
        <SpawnAgentForm
          teamName={selectedTeamName}
          defaultCwd={process.cwd()}
          onSubmit={handleSpawnAgent}
          onCancel={handleCancelOverlay}
        />
      )}
      {nav.view.screen === "send-message" && selectedTeamName && selectedAgent && (
        <SendMessageForm
          teamName={selectedTeamName}
          agentName={selectedAgent.name}
          onSubmit={handleSendMessage}
          onCancel={handleCancelOverlay}
        />
      )}

      {/* Error toast */}
      {error && <ErrorToast message={error} onDismiss={handleDismissError} />}
    </box>
  );
}
