import type { KeyEvent } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useReducer, useState } from "react";
import { attachAgent } from "../actions/attach-agent.ts";
import { createAgent } from "../actions/create-agent.ts";
import { createTeam } from "../actions/create-team.ts";
import { removeAgent } from "../actions/remove-agent.ts";
import { removeTeam } from "../actions/remove-team.ts";
import { sendMessage } from "../actions/send-message.ts";
import { stopAgent } from "../actions/stop-agent.ts";
import { updateAgent } from "../actions/update-agent.ts";
import { updateTeam } from "../actions/update-team.ts";
import { FileProcessRegistry } from "../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../adapters/yaml-blueprint-store.ts";
import { renderError } from "../cli/errors.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import { executeLoad, planLoad } from "../core/blueprint-load.ts";
import { CREW_SENDER } from "../types/constants.ts";
import type { CrewError } from "../types/errors.ts";
import { AgentListPanel } from "./components/agent-list-panel.tsx";
import { AttachForm } from "./components/attach-form.tsx";
import { BlueprintDeployForm } from "./components/blueprint-deploy-form.tsx";
import { BlueprintLoadForm } from "./components/blueprint-load-form.tsx";
import { ConfirmBar } from "./components/confirm-bar.tsx";
import { CreateAgentForm } from "./components/create-agent-form.tsx";
import { CreateTeamForm } from "./components/create-team-form.tsx";
import { EditAgentForm } from "./components/edit-agent-form.tsx";
import { EditTeamForm } from "./components/edit-team-form.tsx";
import { ErrorToast } from "./components/error-toast.tsx";
import { HelpOverlay } from "./components/help-overlay.tsx";
import { InboxView } from "./components/inbox-view.tsx";
import { SendMessageForm } from "./components/send-message-form.tsx";
import { ShortcutBar } from "./components/shortcut-bar.tsx";
import { TeamListPanel } from "./components/team-list-panel.tsx";
import { useAgents } from "./hooks/use-agents.ts";
import { useTeams } from "./hooks/use-teams.ts";
import { buildAttachCommand } from "./launcher/commands.ts";
import type { Launcher } from "./launcher/port.ts";
import { initialNavState, type NavAction, type NavState, navReducer } from "./views/navigation.ts";

function tuiErrorMessage(error: CrewError): string {
  switch (error.kind) {
    case "stale_session":
      return `Agent "${error.agent}" has a stale session. Press 'r' to remove.`;
    case "no_session_id":
      return `Agent "${error.agent}" has no session ID.`;
    default:
      return renderError(error);
  }
}

const configStore = new JsonFileConfigStore();
const inboxStore = new JsonFileInboxStore();
const blueprintStore = new YamlBlueprintStore();
const processRegistry = new FileProcessRegistry();
const ctx = { configStore, inboxStore, blueprintStore, processRegistry };

interface AppProps {
  launcher: Launcher;
}

export function App({ launcher }: AppProps) {
  const { width, height } = useTerminalDimensions();
  const teams = useTeams(ctx.configStore, ctx.processRegistry);
  const [nav, dispatch] = useReducer(
    navReducer as (state: NavState | "quit", action: NavAction) => NavState | "quit",
    initialNavState,
  );
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState("");
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  // Clamp teamIndex when teams list shrinks (e.g. after remove)
  useEffect(() => {
    if (nav === "quit") return;
    if (teams.length > 0 && nav.teamIndex >= teams.length) {
      dispatch({ type: "move_up" });
    }
  }, [teams.length, nav]);

  const selectedTeamName = nav !== "quit" && teams[nav.teamIndex] ? teams[nav.teamIndex].name : null;

  const agents = useAgents(ctx, selectedTeamName);

  // Clamp agentIndex when agents list shrinks
  useEffect(() => {
    if (nav === "quit") return;
    if (agents.length > 0 && nav.agentIndex >= agents.length) {
      dispatch({ type: "move_up" });
    }
  }, [agents.length, nav]);

  const selectedAgent = nav !== "quit" ? (agents[nav.agentIndex] ?? null) : null;

  const isOverlay = nav !== "quit" && nav.view.screen !== "dashboard";
  const isConfirm =
    nav !== "quit" &&
    (nav.view.screen === "confirm-stop" ||
      nav.view.screen === "confirm-remove-team" ||
      nav.view.screen === "confirm-remove-agent");
  // Views that handle all their own keyboard input
  const isDelegatedView =
    nav !== "quit" &&
    (nav.view.screen === "create-team" ||
      nav.view.screen === "create-agent" ||
      nav.view.screen === "send-message" ||
      nav.view.screen === "inbox" ||
      nav.view.screen === "attach-form" ||
      nav.view.screen === "load-blueprint" ||
      nav.view.screen === "deploy-blueprint" ||
      nav.view.screen === "edit-team" ||
      nav.view.screen === "edit-agent");

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
          const maxIndex = nav.panel === "teams" ? Math.max(0, teams.length - 1) : Math.max(0, agents.length - 1);
          dispatch({ type: "move_down", maxIndex });
        } else if ((key.name === "return" || key.name === "l") && nav.panel === "teams") {
          dispatch({ type: "focus_agents" });
        } else if (key.name === "h" && nav.panel === "agents") {
          dispatch({ type: "focus_teams" });
        } else if (key.name === "b" && nav.panel === "teams") {
          dispatch({ type: "open_load_blueprint" });
        } else if (key.name === "n" && nav.panel === "teams") {
          dispatch({ type: "open_create_team" });
        } else if (key.name === "n" && nav.panel === "agents" && selectedTeamName) {
          dispatch({ type: "open_create_agent" });
        } else if ((key.name === "a" || key.name === "return") && nav.panel === "agents") {
          if (selectedAgent && selectedTeamName) {
            dispatch({ type: "open_attach_form" });
          }
        } else if (key.name === "x" && nav.panel === "agents" && selectedAgent) {
          dispatch({ type: "open_confirm_stop" });
        } else if (key.name === "r" && nav.panel === "agents" && selectedAgent) {
          dispatch({ type: "open_confirm_remove_agent" });
        } else if (key.name === "e" && nav.panel === "teams" && selectedTeamName) {
          dispatch({ type: "open_edit_team" });
        } else if (key.name === "e" && nav.panel === "agents" && selectedAgent && selectedTeamName) {
          dispatch({ type: "open_edit_agent" });
        } else if (key.name === "d" && nav.panel === "teams" && selectedTeamName) {
          dispatch({ type: "open_confirm_remove_team" });
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

  const handleCreateTeam = useCallback(async (name: string, description: string) => {
    const result = await createTeam(ctx, {
      name,
      description: description || undefined,
    });
    if (!result.ok) {
      setError(tuiErrorMessage(result.error));
    }
    dispatch({ type: "close_overlay" });
  }, []);

  const handleCreateAgent = useCallback(
    async (opts: {
      name: string;
      agentType: string;
      prompt: string;
      model: string;
      cwd: string;
      extraArgs: string[];
    }) => {
      if (!selectedTeamName) return;
      const result = await createAgent(ctx, {
        team: selectedTeamName,
        name: opts.name || undefined,
        agentType: opts.agentType,
        prompt: opts.prompt || undefined,
        model: opts.model || undefined,
        extraArgs: opts.extraArgs.length > 0 ? opts.extraArgs : undefined,
      });
      if (!result.ok) {
        setError(tuiErrorMessage(result.error));
      }
      dispatch({ type: "close_overlay" });
    },
    [selectedTeamName],
  );

  const handleConfirmStop = useCallback(() => {
    if (nav === "quit") return;
    const agent = agents[nav.agentIndex];
    if (agent) {
      stopAgent(ctx.processRegistry, selectedTeamName ?? "", agent.agentId);
    }
    dispatch({ type: "close_overlay" });
  }, [nav, agents, selectedTeamName]);

  const handleConfirmRemoveTeam = useCallback(async () => {
    if (!selectedTeamName) return;
    const result = await removeTeam(ctx, { team: selectedTeamName });
    if (!result.ok) {
      setError(`Remove failed: ${result.error.kind}`);
    }
    dispatch({ type: "close_overlay" });
  }, [selectedTeamName]);

  const handleConfirmRemoveAgent = useCallback(async () => {
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
        from: CREW_SENDER,
      });
      if (!result.ok) {
        setError(`Send failed: ${result.error.kind}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [selectedTeamName, selectedAgent],
  );

  const handleAttach = useCallback(
    async (extraArgs: string[]) => {
      if (!selectedTeamName || !selectedAgent) return;
      const result = await attachAgent(ctx, { team: selectedTeamName, name: selectedAgent.name });
      if (!result.ok) {
        setError(tuiErrorMessage(result.error));
        dispatch({ type: "close_overlay" });
        return;
      }
      const args = buildAttachCommand(selectedTeamName, selectedAgent.name, extraArgs);
      try {
        await launcher.openTerminal(args, selectedAgent.cwd, `crew:${selectedAgent.name}`);
      } catch (e: unknown) {
        setError(`Failed to attach: ${e instanceof Error ? e.message : String(e)}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [launcher, selectedTeamName, selectedAgent],
  );

  const handleSelectBlueprint = useCallback((blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    dispatch({ type: "open_deploy_blueprint" });
  }, []);

  const handleDeployBlueprint = useCallback(
    async (blueprint: Blueprint, teamName: string) => {
      const plan = await planLoad(ctx, { nameOrPath: blueprint.name, teamName });
      if (!plan.ok) {
        setError(tuiErrorMessage(plan.error));
        dispatch({ type: "close_overlay" });
        setSelectedBlueprint(null);
        return;
      }

      const result = await executeLoad(ctx, plan.value);
      if (!result.ok) {
        setError(`Blueprint load failed: ${result.error.kind}`);
        dispatch({ type: "close_overlay" });
        setSelectedBlueprint(null);
        return;
      }

      for (const opts of result.value.launchOptions) {
        const cmd = buildAttachCommand(result.value.teamName, opts.agentName, opts.extraArgs);
        try {
          await launcher.openTerminal(cmd, opts.cwd, `crew:${opts.agentName}`);
        } catch (e: unknown) {
          setError(`Failed to launch ${opts.agentName}: ${e instanceof Error ? e.message : String(e)}`);
          break;
        }
      }
      dispatch({ type: "close_overlay" });
      setSelectedBlueprint(null);
    },
    [launcher],
  );

  const handleBackFromDeploy = useCallback(() => {
    dispatch({ type: "close_overlay" });
  }, []);

  const handleEditTeam = useCallback(
    async (description: string) => {
      if (!selectedTeamName) return;
      const result = await updateTeam(ctx, { team: selectedTeamName, description });
      if (!result.ok) {
        setError(`Update failed: ${result.error.kind}`);
      }
      dispatch({ type: "close_overlay" });
    },
    [selectedTeamName],
  );

  const handleEditAgent = useCallback(
    async (updates: { model?: string; prompt?: string; color?: string; extraArgs?: string[] }) => {
      if (!selectedTeamName || !selectedAgent) return;
      const result = await updateAgent(ctx, {
        team: selectedTeamName,
        name: selectedAgent.name,
        ...updates,
      });
      if (!result.ok) {
        setError(`Update failed: ${result.error.kind}`);
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
          inboxStore={ctx.inboxStore}
          teamName={selectedTeamName}
          agentName={selectedAgent.name}
          onClose={handleCancelOverlay}
          onSend={() => dispatch({ type: "open_send_message" })}
        />
        {nav.view.screen === "inbox" && error && <ErrorToast message={error} onDismiss={handleDismissError} />}
      </box>
    );
  }

  // Build confirm messages
  const stopMessage = selectedAgent ? `Stop agent "${selectedAgent.name}"?` : "";
  const removeTeamMessage = selectedTeamName
    ? `Remove team "${selectedTeamName}"? Stops ${agents.filter((a) => a.status === "running").length} agent(s).`
    : "";
  const removeAgentMessage = selectedAgent
    ? selectedAgent.status === "running"
      ? `Remove "${selectedAgent.name}"? Stops process, deletes inbox, removes from config.`
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
        <TeamListPanel teams={teams} selectedIndex={nav.teamIndex} focused={nav.panel === "teams" && !isOverlay} />
        <AgentListPanel
          agents={agents}
          selectedIndex={nav.agentIndex}
          focused={nav.panel === "agents" && !isOverlay}
          teamName={selectedTeamName}
        />
      </box>

      {/* Bottom bar — either shortcut bar or confirm bar */}
      {nav.view.screen === "confirm-stop" ? (
        <ConfirmBar message={stopMessage} onConfirm={handleConfirmStop} onCancel={handleCancelOverlay} />
      ) : nav.view.screen === "confirm-remove-team" ? (
        <ConfirmBar message={removeTeamMessage} onConfirm={handleConfirmRemoveTeam} onCancel={handleCancelOverlay} />
      ) : nav.view.screen === "confirm-remove-agent" ? (
        <ConfirmBar message={removeAgentMessage} onConfirm={handleConfirmRemoveAgent} onCancel={handleCancelOverlay} />
      ) : (
        <ShortcutBar panel={nav.panel} />
      )}

      {/* Overlays */}
      {nav.view.screen === "help" && <HelpOverlay />}
      {nav.view.screen === "create-team" && (
        <CreateTeamForm onSubmit={handleCreateTeam} onCancel={handleCancelOverlay} />
      )}
      {nav.view.screen === "create-agent" && selectedTeamName && (
        <CreateAgentForm
          teamName={selectedTeamName}
          defaultCwd={process.cwd()}
          onSubmit={handleCreateAgent}
          onCancel={handleCancelOverlay}
        />
      )}
      {nav.view.screen === "attach-form" && selectedTeamName && selectedAgent && (
        <AttachForm
          agentName={selectedAgent.name}
          storedArgs={selectedAgent.extraArgs ?? []}
          onSubmit={handleAttach}
          onCancel={handleCancelOverlay}
        />
      )}
      {nav.view.screen === "load-blueprint" && (
        <BlueprintLoadForm ctx={ctx} onSubmit={handleSelectBlueprint} onCancel={handleCancelOverlay} />
      )}
      {nav.view.screen === "deploy-blueprint" && selectedBlueprint && (
        <BlueprintDeployForm
          blueprint={selectedBlueprint}
          onDeploy={handleDeployBlueprint}
          onBack={handleBackFromDeploy}
        />
      )}
      {nav.view.screen === "edit-team" && selectedTeamName && (
        <EditTeamForm
          teamName={selectedTeamName}
          currentDescription={teams[nav.teamIndex]?.description ?? ""}
          onSubmit={handleEditTeam}
          onCancel={handleCancelOverlay}
        />
      )}
      {nav.view.screen === "edit-agent" && selectedTeamName && selectedAgent && (
        <EditAgentForm
          teamName={selectedTeamName}
          agent={selectedAgent}
          onSubmit={handleEditAgent}
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
