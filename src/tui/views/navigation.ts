export type View =
  | { screen: "dashboard" }
  | { screen: "help" };

export type Panel = "teams";

export interface NavState {
  view: View;
  panel: Panel;
  selectedIndex: number;
}

export const initialNavState: NavState = {
  view: { screen: "dashboard" },
  panel: "teams",
  selectedIndex: 0,
};

export type NavAction =
  | { type: "move_up" }
  | { type: "move_down"; maxIndex: number }
  | { type: "toggle_help" }
  | { type: "close_overlay" }
  | { type: "quit" };

export function navReducer(state: NavState, action: NavAction): NavState | "quit" {
  switch (action.type) {
    case "move_up":
      return {
        ...state,
        selectedIndex: Math.max(0, state.selectedIndex - 1),
      };

    case "move_down":
      return {
        ...state,
        selectedIndex: Math.min(action.maxIndex, state.selectedIndex + 1),
      };

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
