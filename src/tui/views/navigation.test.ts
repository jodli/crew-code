import { describe, expect, test } from "bun:test";
import { navReducer, initialNavState, type NavState } from "./navigation.ts";

describe("navReducer", () => {
  test("initial state is dashboard with index 0", () => {
    expect(initialNavState.view.screen).toBe("dashboard");
    expect(initialNavState.selectedIndex).toBe(0);
  });

  test("move_down increments index up to max", () => {
    const s1 = navReducer(initialNavState, { type: "move_down", maxIndex: 2 });
    expect(s1).not.toBe("quit");
    if (s1 === "quit") return;
    expect(s1.selectedIndex).toBe(1);

    const s2 = navReducer(s1, { type: "move_down", maxIndex: 2 });
    if (s2 === "quit") return;
    expect(s2.selectedIndex).toBe(2);

    const s3 = navReducer(s2, { type: "move_down", maxIndex: 2 });
    if (s3 === "quit") return;
    expect(s3.selectedIndex).toBe(2);
  });

  test("move_up decrements index down to 0", () => {
    const state: NavState = { ...initialNavState, selectedIndex: 2 };
    const s1 = navReducer(state, { type: "move_up" });
    if (s1 === "quit") return;
    expect(s1.selectedIndex).toBe(1);

    const s2 = navReducer(s1, { type: "move_up" });
    if (s2 === "quit") return;
    expect(s2.selectedIndex).toBe(0);

    const s3 = navReducer(s2, { type: "move_up" });
    if (s3 === "quit") return;
    expect(s3.selectedIndex).toBe(0);
  });

  test("toggle_help switches between dashboard and help", () => {
    const s1 = navReducer(initialNavState, { type: "toggle_help" });
    if (s1 === "quit") return;
    expect(s1.view.screen).toBe("help");

    const s2 = navReducer(s1, { type: "toggle_help" });
    if (s2 === "quit") return;
    expect(s2.view.screen).toBe("dashboard");
  });

  test("close_overlay returns to dashboard from help", () => {
    const helpState: NavState = {
      ...initialNavState,
      view: { screen: "help" },
    };
    const s = navReducer(helpState, { type: "close_overlay" });
    if (s === "quit") return;
    expect(s.view.screen).toBe("dashboard");
  });

  test("close_overlay is no-op on dashboard", () => {
    const s = navReducer(initialNavState, { type: "close_overlay" });
    if (s === "quit") return;
    expect(s.view.screen).toBe("dashboard");
  });

  test("quit returns 'quit'", () => {
    const s = navReducer(initialNavState, { type: "quit" });
    expect(s).toBe("quit");
  });
});
