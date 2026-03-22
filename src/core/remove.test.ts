import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeInboxStore, makeProcessRegistry } from "../test/helpers.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { executeRemoveAgent, planRemoveAgent } from "./remove.ts";

function makeMockRegistry(runningAgentIds: string[] = []) {
  return makeProcessRegistry({
    isRunning: async (_team, agentId) => runningAgentIds.includes(agentId),
  });
}

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: makeConfigStore({
      getTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      updateTeam: async (_name, updater) => ok(updater(baseConfig)),
    }),
    inboxStore: makeInboxStore(),
    ...overrides,
  };
}

const baseConfig: TeamConfig = {
  name: "my-team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@my-team",
  leadSessionId: "lead-session-123",
  members: [
    {
      agentId: "team-lead@my-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
      sessionId: "lead-session-123",
    },
    {
      agentId: "worker@my-team",
      name: "worker",
      agentType: "general-purpose",
      joinedAt: 1773387770000,
      cwd: "/tmp",
      subscriptions: [],
      sessionId: "worker-session-456",
    },
  ],
};

describe("core/remove-agent", () => {
  describe("planRemoveAgent()", () => {
    test("returns team_not_found for missing team", async () => {
      const ctx = makeCtx();
      const result = await planRemoveAgent(ctx, { team: "no-team", name: "worker" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });

    test("returns agent_not_found for missing agent name", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "ghost" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("agent_not_found");
      }
    });

    test("allows removing the lead agent", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "team-lead" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("team-lead");
      }
    });

    test("returns plan with isRunning: false when no registry provided", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["worker"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isRunning).toBe(false);
      }
    });

    test("returns plan with isRunning: true when agent is alive in registry", async () => {
      const registry = makeMockRegistry(["worker@my-team"]);
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["worker"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "worker" }, registry);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isRunning).toBe(true);
      }
    });

    test("returns plan with hasInbox: true when inbox exists", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "worker"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasInbox).toBe(true);
      }
    });

    test("returns plan with hasInbox: false when no inbox exists", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasInbox).toBe(false);
      }
    });

    test("plan contains correct agent details", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          getTeam: async () => ok(baseConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["worker"]),
        }),
      });

      const result = await planRemoveAgent(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.team).toBe("my-team");
        expect(result.value.name).toBe("worker");
        expect(result.value.agentId).toBe("worker@my-team");
      }
    });
  });

  describe("executeRemoveAgent()", () => {
    test("removes member from config", async () => {
      let updatedConfig: TeamConfig | null = null;
      const ctx = makeCtx({
        configStore: makeConfigStore({
          updateTeam: async (_name, updater) => {
            updatedConfig = updater(baseConfig);
            return ok(updatedConfig);
          },
        }),
      });

      const result = await executeRemoveAgent(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        isRunning: false,
        hasInbox: false,
      });

      expect(result.ok).toBe(true);
      expect(updatedConfig).not.toBeNull();
      expect(updatedConfig!.members).toHaveLength(1);
      expect(updatedConfig!.members[0].name).toBe("team-lead");
    });

    test("calls deleteInbox when hasInbox is true", async () => {
      let deleteCalled = false;
      const ctx = makeCtx({
        inboxStore: makeInboxStore({
          deleteInbox: async (_team: string, agent: string) => {
            if (agent === "worker") deleteCalled = true;
            return ok(undefined);
          },
        }),
      });

      await executeRemoveAgent(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        isRunning: false,
        hasInbox: true,
      });

      expect(deleteCalled).toBe(true);
    });

    test("does not call deleteInbox when hasInbox is false", async () => {
      let deleteCalled = false;
      const ctx = makeCtx({
        inboxStore: makeInboxStore({
          deleteInbox: async () => {
            deleteCalled = true;
            return ok(undefined);
          },
        }),
      });

      await executeRemoveAgent(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        isRunning: false,
        hasInbox: false,
      });

      expect(deleteCalled).toBe(false);
    });

    test("returns ok on success", async () => {
      const ctx = makeCtx();
      const result = await executeRemoveAgent(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        isRunning: false,
        hasInbox: false,
      });

      expect(result.ok).toBe(true);
    });
  });
});
