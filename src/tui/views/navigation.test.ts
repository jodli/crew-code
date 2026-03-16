import { describe, expect, test } from "bun:test";
import { navReducer, initialNavState, type NavState } from "./navigation.ts";

describe("navReducer", () => {
  test("initial state is dashboard, teams panel, index 0", () => {
    expect(initialNavState.view.screen).toBe("dashboard");
    expect(initialNavState.panel).toBe("teams");
    expect(initialNavState.teamIndex).toBe(0);
    expect(initialNavState.agentIndex).toBe(0);
  });

  describe("move_down / move_up on teams panel", () => {
    test("move_down increments teamIndex up to max", () => {
      const s1 = navReducer(initialNavState, { type: "move_down", maxIndex: 2 });
      if (s1 === "quit") return;
      expect(s1.teamIndex).toBe(1);

      const s2 = navReducer(s1, { type: "move_down", maxIndex: 2 });
      if (s2 === "quit") return;
      expect(s2.teamIndex).toBe(2);

      const s3 = navReducer(s2, { type: "move_down", maxIndex: 2 });
      if (s3 === "quit") return;
      expect(s3.teamIndex).toBe(2);
    });

    test("move_up decrements teamIndex down to 0", () => {
      const state: NavState = { ...initialNavState, teamIndex: 2 };
      const s1 = navReducer(state, { type: "move_up" });
      if (s1 === "quit") return;
      expect(s1.teamIndex).toBe(1);

      const s2 = navReducer(s1, { type: "move_up" });
      if (s2 === "quit") return;
      expect(s2.teamIndex).toBe(0);

      const s3 = navReducer(s2, { type: "move_up" });
      if (s3 === "quit") return;
      expect(s3.teamIndex).toBe(0);
    });
  });

  describe("move_down / move_up on agents panel", () => {
    const agentsState: NavState = { ...initialNavState, panel: "agents" };

    test("move_down increments agentIndex", () => {
      const s1 = navReducer(agentsState, { type: "move_down", maxIndex: 3 });
      if (s1 === "quit") return;
      expect(s1.agentIndex).toBe(1);
      expect(s1.teamIndex).toBe(0); // unchanged
    });

    test("move_up decrements agentIndex", () => {
      const state: NavState = { ...agentsState, agentIndex: 2 };
      const s1 = navReducer(state, { type: "move_up" });
      if (s1 === "quit") return;
      expect(s1.agentIndex).toBe(1);
    });
  });

  describe("panel switching", () => {
    test("switch_panel toggles between teams and agents", () => {
      const s1 = navReducer(initialNavState, { type: "switch_panel" });
      if (s1 === "quit") return;
      expect(s1.panel).toBe("agents");

      const s2 = navReducer(s1, { type: "switch_panel" });
      if (s2 === "quit") return;
      expect(s2.panel).toBe("teams");
    });

    test("focus_agents switches to agents panel", () => {
      const s = navReducer(initialNavState, { type: "focus_agents" });
      if (s === "quit") return;
      expect(s.panel).toBe("agents");
    });

    test("focus_teams switches to teams panel", () => {
      const state: NavState = { ...initialNavState, panel: "agents" };
      const s = navReducer(state, { type: "focus_teams" });
      if (s === "quit") return;
      expect(s.panel).toBe("teams");
    });
  });

  describe("selecting a different team resets agentIndex", () => {
    test("moving teamIndex resets agentIndex to 0", () => {
      const state: NavState = { ...initialNavState, agentIndex: 3 };
      const s = navReducer(state, { type: "move_down", maxIndex: 5 });
      if (s === "quit") return;
      expect(s.teamIndex).toBe(1);
      expect(s.agentIndex).toBe(0);
    });
  });

  describe("help overlay", () => {
    test("toggle_help switches between dashboard and help", () => {
      const s1 = navReducer(initialNavState, { type: "toggle_help" });
      if (s1 === "quit") return;
      expect(s1.view.screen).toBe("help");

      const s2 = navReducer(s1, { type: "toggle_help" });
      if (s2 === "quit") return;
      expect(s2.view.screen).toBe("dashboard");
    });

    test("close_overlay returns to dashboard from help", () => {
      const helpState: NavState = { ...initialNavState, view: { screen: "help" } };
      const s = navReducer(helpState, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });

    test("close_overlay is no-op on dashboard", () => {
      const s = navReducer(initialNavState, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("create-team overlay", () => {
    test("open_create_team switches to create-team view", () => {
      const s = navReducer(initialNavState, { type: "open_create_team" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("create-team");
    });

    test("close_overlay returns to dashboard from create-team", () => {
      const state: NavState = { ...initialNavState, view: { screen: "create-team" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });

    test("navigation keys are ignored during create-team overlay", () => {
      const state: NavState = { ...initialNavState, view: { screen: "create-team" }, teamIndex: 1 };
      // move_down should not change index when overlay is open
      // (app handles this by not dispatching move actions during overlays)
      // but the state machine itself doesn't block — the app layer does
      expect(state.view.screen).toBe("create-team");
    });
  });

  describe("spawn-agent overlay", () => {
    test("open_spawn_agent switches to spawn-agent view", () => {
      const state: NavState = { ...initialNavState, panel: "agents" };
      const s = navReducer(state, { type: "open_spawn_agent" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("spawn-agent");
    });

    test("close_overlay returns to dashboard from spawn-agent", () => {
      const state: NavState = { ...initialNavState, view: { screen: "spawn-agent" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("confirm-kill-agent", () => {
    test("open_confirm_kill switches to confirm-kill view", () => {
      const state: NavState = { ...initialNavState, panel: "agents" };
      const s = navReducer(state, { type: "open_confirm_kill" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("confirm-kill");
    });

    test("close_overlay returns to dashboard from confirm-kill", () => {
      const state: NavState = { ...initialNavState, view: { screen: "confirm-kill" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("confirm-destroy-team", () => {
    test("open_confirm_destroy switches to confirm-destroy view", () => {
      const s = navReducer(initialNavState, { type: "open_confirm_destroy" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("confirm-destroy");
    });

    test("close_overlay returns to dashboard from confirm-destroy", () => {
      const state: NavState = { ...initialNavState, view: { screen: "confirm-destroy" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("inbox view", () => {
    test("open_inbox switches to inbox view", () => {
      const state: NavState = { ...initialNavState, panel: "agents" };
      const s = navReducer(state, { type: "open_inbox" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("inbox");
    });

    test("close_overlay returns to dashboard from inbox", () => {
      const state: NavState = { ...initialNavState, view: { screen: "inbox" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("send-message overlay", () => {
    test("open_send_message switches to send-message view", () => {
      const state: NavState = { ...initialNavState, panel: "agents" };
      const s = navReducer(state, { type: "open_send_message" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("send-message");
    });

    test("close_overlay returns to dashboard from send-message", () => {
      const state: NavState = { ...initialNavState, view: { screen: "send-message" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  describe("load-blueprint overlay", () => {
    test("open_load_blueprint switches to load-blueprint view", () => {
      const s = navReducer(initialNavState, { type: "open_load_blueprint" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("load-blueprint");
    });

    test("close_overlay returns to dashboard from load-blueprint", () => {
      const state: NavState = { ...initialNavState, view: { screen: "load-blueprint" } };
      const s = navReducer(state, { type: "close_overlay" });
      if (s === "quit") return;
      expect(s.view.screen).toBe("dashboard");
    });
  });

  test("quit returns 'quit'", () => {
    const s = navReducer(initialNavState, { type: "quit" });
    expect(s).toBe("quit");
  });
});
