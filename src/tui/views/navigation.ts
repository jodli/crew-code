export type View =
  | { screen: "dashboard" }
  | { screen: "create-team" }
  | { screen: "create-agent" }
  | { screen: "confirm-stop" }
  | { screen: "confirm-remove-team" }
  | { screen: "confirm-remove-agent" }
  | { screen: "inbox" }
  | { screen: "send-message" }
  | { screen: "help" }
  | { screen: "start-form" }
  | { screen: "load-blueprint" }
  | { screen: "deploy-blueprint" }
  | { screen: "edit-team" }
  | { screen: "edit-agent" };

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
  | { type: "open_create_agent" }
  | { type: "open_confirm_stop" }
  | { type: "open_confirm_remove_team" }
  | { type: "open_confirm_remove_agent" }
  | { type: "open_inbox" }
  | { type: "open_send_message" }
  | { type: "open_start_form" }
  | { type: "open_load_blueprint" }
  | { type: "open_deploy_blueprint" }
  | { type: "open_edit_team" }
  | { type: "open_edit_agent" }
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

    case "open_create_agent":
      return { ...state, view: { screen: "create-agent" } };

    case "open_confirm_stop":
      return { ...state, view: { screen: "confirm-stop" } };

    case "open_confirm_remove_team":
      return { ...state, view: { screen: "confirm-remove-team" } };

    case "open_confirm_remove_agent":
      return { ...state, view: { screen: "confirm-remove-agent" } };

    case "open_inbox":
      return { ...state, view: { screen: "inbox" } };

    case "open_send_message":
      return { ...state, view: { screen: "send-message" } };

    case "open_start_form":
      return { ...state, view: { screen: "start-form" } };

    case "open_load_blueprint":
      return { ...state, view: { screen: "load-blueprint" } };

    case "open_deploy_blueprint":
      return { ...state, view: { screen: "deploy-blueprint" } };

    case "open_edit_team":
      return { ...state, view: { screen: "edit-team" } };

    case "open_edit_agent":
      return { ...state, view: { screen: "edit-agent" } };

    case "toggle_help":
      if (state.view.screen === "help") {
        return { ...state, view: { screen: "dashboard" } };
      }
      return { ...state, view: { screen: "help" } };

    case "close_overlay":
      if (state.view.screen === "deploy-blueprint") {
        return { ...state, view: { screen: "load-blueprint" } };
      }
      if (state.view.screen !== "dashboard") {
        return { ...state, view: { screen: "dashboard" } };
      }
      return state;

    case "quit":
      return "quit";
  }
}
