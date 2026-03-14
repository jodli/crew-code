export type View =
  | { screen: "dashboard" }
  | { screen: "help" };

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
