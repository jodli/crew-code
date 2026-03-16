import { describe, expect, test } from "bun:test";
import { planRemove, executeRemove } from "./remove.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      updateTeam: async (_name, updater) => ok(updater(baseConfig)),
      teamExists: async () => false,
      createTeam: async () => ok(undefined),
      listTeams: async () => ok([]),
      deleteTeam: async () => ok(undefined),
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async () => ok([]),
      appendMessage: async () => ok(undefined),
      listInboxes: async () => ok([]),
      deleteInbox: async () => ok(undefined),
    },
    ...overrides,
  };
}

const baseConfig: TeamConfig = {
  name: "my-team",
  createdAt: 1773387766070,
  leadSessionId: "lead-session-123",
  members: [
    {
      agentId: "team-lead@my-team",
      name: "team-lead",
      isLead: true,
      joinedAt: 1773387766070,
      processId: String(process.pid),
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
      sessionId: "lead-session-123",
    },
    {
      agentId: "worker@my-team",
      name: "worker",
      joinedAt: 1773387770000,
      processId: "99999999",
      cwd: "/tmp",
      subscriptions: [],
      isActive: false,
      sessionId: "worker-session-456",
    },
  ],
};

describe("core/remove", () => {
  describe("planRemove()", () => {
    test("returns team_not_found for missing team", async () => {
      const ctx = makeCtx();
      const result = await planRemove(ctx, { team: "no-team", name: "worker" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });

    test("returns agent_not_found for missing agent name", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "ghost" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("agent_not_found");
      }
    });

    test("allows removing the lead agent", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "team-lead" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("team-lead");
      }
    });

    test("returns plan with isAlive: false when process is dead", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["worker"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isAlive).toBe(false);
      }
    });

    test("returns plan with isAlive: true when process is alive", async () => {
      const aliveConfig: TeamConfig = {
        ...baseConfig,
        members: [
          baseConfig.members[0],
          { ...baseConfig.members[1], processId: String(process.pid) },
        ],
      };

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(aliveConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["worker"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.isAlive).toBe(true);
      }
    });

    test("returns plan with hasInbox: true when inbox exists", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "worker"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasInbox).toBe(true);
      }
    });

    test("returns plan with hasInbox: false when no inbox exists", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasInbox).toBe(false);
      }
    });

    test("plan contains correct agent details", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(baseConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["worker"]),
        },
      });

      const result = await planRemove(ctx, { team: "my-team", name: "worker" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.team).toBe("my-team");
        expect(result.value.name).toBe("worker");
        expect(result.value.agentId).toBe("worker@my-team");
        expect(result.value.processId).toBe("99999999");
      }
    });
  });

  describe("executeRemove()", () => {
    test("removes member from config", async () => {
      let updatedConfig: TeamConfig | null = null;
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          updateTeam: async (_name, updater) => {
            updatedConfig = updater(baseConfig);
            return ok(updatedConfig);
          },
        },
      });

      const result = await executeRemove(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        processId: "99999999",
        isAlive: false,
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
        inboxStore: {
          ...makeCtx().inboxStore,
          deleteInbox: async (_team: string, agent: string) => {
            if (agent === "worker") deleteCalled = true;
            return ok(undefined);
          },
        },
      });

      await executeRemove(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        processId: "99999999",
        isAlive: false,
        hasInbox: true,
      });

      expect(deleteCalled).toBe(true);
    });

    test("does not call deleteInbox when hasInbox is false", async () => {
      let deleteCalled = false;
      const ctx = makeCtx({
        inboxStore: {
          ...makeCtx().inboxStore,
          deleteInbox: async () => {
            deleteCalled = true;
            return ok(undefined);
          },
        },
      });

      await executeRemove(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        processId: "99999999",
        isAlive: false,
        hasInbox: false,
      });

      expect(deleteCalled).toBe(false);
    });

    test("returns ok on success", async () => {
      const ctx = makeCtx();
      const result = await executeRemove(ctx, {
        team: "my-team",
        name: "worker",
        agentId: "worker@my-team",
        processId: "99999999",
        isAlive: false,
        hasInbox: false,
      });

      expect(result.ok).toBe(true);
    });
  });
});
