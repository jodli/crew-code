export type View =
  | { screen: "dashboard" }
  | { screen: "create-team" }
  | { screen: "spawn-agent" }
  | { screen: "confirm-kill" }
  | { screen: "confirm-destroy" }
  | { screen: "confirm-remove" }
  | { screen: "inbox" }
  | { screen: "send-message" }
  | { screen: "help" }
  | { screen: "attach-form" };

export type Panel = "teams" | "agents";

export interface NavState {
  view: View;
  panel: Panel;
  teamIndex: number;
  agentIndex: number;
}

export const initialNavState: NavState = {
  view: { screen: "dashboard" },
  panel: "teams",
  teamIndex: 0,
  agentIndex: 0,
};

export type NavAction =
  | { type: "move_up" }
  | { type: "move_down"; maxIndex: number }
  | { type: "switch_panel" }
  | { type: "focus_teams" }
  | { type: "focus_agents" }
  | { type: "open_create_team" }
  | { type: "open_spawn_agent" }
  | { type: "open_confirm_kill" }
  | { type: "open_confirm_destroy" }
  | { type: "open_confirm_remove" }
  | { type: "open_inbox" }
  | { type: "open_send_message" }
  | { type: "open_attach_form" }
  | { type: "toggle_help" }
  | { type: "close_overlay" }
  | { type: "quit" };

export function navReducer(state: NavState, action: NavAction): NavState | "quit" {
  switch (action.type) {
    case "move_up":
      if (state.panel === "teams") {
        return { ...state, teamIndex: Math.max(0, state.teamIndex - 1), agentIndex: 0 };
      }
      return { ...state, agentIndex: Math.max(0, state.agentIndex - 1) };

    case "move_down":
      if (state.panel === "teams") {
        const newIndex = Math.min(action.maxIndex, state.teamIndex + 1);
        const resetAgents = newIndex !== state.teamIndex;
        return {
          ...state,
          teamIndex: newIndex,
          agentIndex: resetAgents ? 0 : state.agentIndex,
        };
      }
      return { ...state, agentIndex: Math.min(action.maxIndex, state.agentIndex + 1) };

    case "switch_panel":
      return { ...state, panel: state.panel === "teams" ? "agents" : "teams" };

    case "focus_teams":
      return { ...state, panel: "teams" };

    case "focus_agents":
      return { ...state, panel: "agents" };

    case "open_create_team":
      return { ...state, view: { screen: "create-team" } };

    case "open_spawn_agent":
      return { ...state, view: { screen: "spawn-agent" } };

    case "open_confirm_kill":
      return { ...state, view: { screen: "confirm-kill" } };

    case "open_confirm_destroy":
      return { ...state, view: { screen: "confirm-destroy" } };

    case "open_confirm_remove":
      return { ...state, view: { screen: "confirm-remove" } };

    case "open_inbox":
      return { ...state, view: { screen: "inbox" } };

    case "open_send_message":
      return { ...state, view: { screen: "send-message" } };

    case "open_attach_form":
      return { ...state, view: { screen: "attach-form" } };

    case "toggle_help":
      if (state.view.screen === "help") {
        return { ...state, view: { screen: "dashboard" } };
      }
      return { ...state, view: { screen: "help" } };

    case "close_overlay":
      if (state.view.screen !== "dashboard") {
        return { ...state, view: { screen: "dashboard" } };
      }
      return state;

    case "quit":
      return "quit";
  }
}
