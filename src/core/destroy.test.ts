import { describe, expect, test } from "bun:test";
import {
  planDestroy,
  executeDestroy,
  type DestroyInput,
  type DestroyPlan,
} from "./destroy.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const sampleConfig: TeamConfig = {
  name: "my-team",
  description: "A test team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@my-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "team-lead@my-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      tmuxPaneId: "%0",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      joinedAt: 1773387766070,
      tmuxPaneId: "%1",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
  ],
};

let killedPanes: string[] = [];
let deletedInboxes: { team: string; agent: string }[] = [];
let deletedTeams: string[] = [];
let updatedTeams: { name: string; config: TeamConfig }[] = [];

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (name === "my-team") return ok(structuredClone(sampleConfig));
        return err({ kind: "team_not_found", team: name });
      },
      updateTeam: async (name: string, updater: (c: TeamConfig) => TeamConfig) => {
        const config = structuredClone(sampleConfig);
        const updated = updater(config);
        updatedTeams.push({ name, config: updated });
        return ok(updated);
      },
      teamExists: async (name: string) => name === "my-team",
      createTeam: async () => ok(undefined),
      listTeams: async () => ok(["my-team"]),
      deleteTeam: async (name: string) => {
        deletedTeams.push(name);
        return ok(undefined);
      },
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async () => ok([]),
      listInboxes: async () => ok(["team-lead", "scout"]),
      appendMessage: async () => ok(undefined),
      deleteInbox: async (team: string, agent: string) => {
        deletedInboxes.push({ team, agent });
        return ok(undefined);
      },
    },
    launcher: {
      preflight: async () => ok(undefined),
      launch: async () => ok("%0"),
      isAlive: async (paneId: string) =>
        paneId === "%0" || paneId === "%1",
      kill: async (paneId: string) => {
        killedPanes.push(paneId);
        return ok(undefined);
      },
    },
    ...overrides,
  };
}

function resetTracking() {
  killedPanes = [];
  deletedInboxes = [];
  deletedTeams = [];
  updatedTeams = [];
}

describe("core/destroy", () => {
  describe("planDestroy()", () => {
    test("returns error if team doesn't exist", async () => {
      resetTracking();
      const ctx = makeCtx();
      const result = await planDestroy(ctx, { team: "no-such-team" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });

    test("returns a plan with team info and active agents", async () => {
      resetTracking();
      const ctx = makeCtx();
      const result = await planDestroy(ctx, { team: "my-team" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const plan = result.value;
        expect(plan.team).toBe("my-team");
        expect(plan.activeAgents).toHaveLength(2);
        expect(plan.inboxes).toHaveLength(2);
      }
    });

    test("only includes alive agents in activeAgents", async () => {
      resetTracking();
      const ctx = makeCtx({
        launcher: {
          preflight: async () => ok(undefined),
          launch: async () => ok("%0"),
          isAlive: async (paneId: string) => paneId === "%0", // only %0 alive
          kill: async (paneId: string) => {
            killedPanes.push(paneId);
            return ok(undefined);
          },
        },
      });
      const result = await planDestroy(ctx, { team: "my-team" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(1);
        expect(result.value.activeAgents[0].name).toBe("team-lead");
      }
    });
  });

  describe("executeDestroy()", () => {
    test("kills all active agents via launcher", async () => {
      resetTracking();
      const ctx = makeCtx();
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [
          { name: "team-lead", paneId: "%0" },
          { name: "scout", paneId: "%1" },
        ],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(killedPanes.sort()).toEqual(["%0", "%1"]);
    });

    test("deletes all inbox files", async () => {
      resetTracking();
      const ctx = makeCtx();
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedInboxes).toHaveLength(2);
      expect(deletedInboxes.map((d) => d.agent).sort()).toEqual([
        "scout",
        "team-lead",
      ]);
    });

    test("deletes team config", async () => {
      resetTracking();
      const ctx = makeCtx();
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: [],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedTeams).toEqual(["my-team"]);
    });

    test("handles already-dead agents gracefully", async () => {
      resetTracking();
      const ctx = makeCtx({
        launcher: {
          preflight: async () => ok(undefined),
          launch: async () => ok("%0"),
          isAlive: async () => false,
          kill: async (paneId: string) => {
            killedPanes.push(paneId);
            return err({
              kind: "tmux_exec_failed" as const,
              detail: "pane not found",
            });
          },
        },
      });
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [{ name: "team-lead", paneId: "%0" }],
        inboxes: [],
      };

      // Should not fail even though kill returns error
      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
    });

    test("full flow: kills agents, deletes inboxes, deletes team", async () => {
      resetTracking();
      const ctx = makeCtx();
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [
          { name: "team-lead", paneId: "%0" },
          { name: "scout", paneId: "%1" },
        ],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(killedPanes).toHaveLength(2);
      expect(deletedInboxes).toHaveLength(2);
      expect(deletedTeams).toEqual(["my-team"]);
    });
  });
});
