import { describe, expect, test } from "bun:test";
import {
  planDestroy,
  executeDestroy,
  type DestroyPlan,
} from "./destroy.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { ProcessRegistry, RegistryEntry } from "../ports/process-registry.ts";
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
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

let deletedInboxes: { team: string; agent: string }[] = [];
let deletedTeams: string[] = [];

function makeMockRegistry(entries: RegistryEntry[] = []): ProcessRegistry & { killed: string[]; cleaned: string[] } {
  const killed: string[] = [];
  const cleaned: string[] = [];
  return {
    killed,
    cleaned,
    async activate() { return ok(undefined); },
    async deactivate() { return ok(undefined); },
    async isAlive(_team, agentId) { return entries.some((e) => e.agentId === agentId); },
    async kill(_team, agentId) {
      killed.push(agentId);
      return ok(true);
    },
    async listActive() { return ok([...entries]); },
    async cleanup(team) {
      cleaned.push(team);
      return ok(undefined);
    },
  };
}

function makeCtx(config: TeamConfig): AppContext {
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (name === "my-team") return ok(structuredClone(config));
        return err({ kind: "team_not_found", team: name });
      },
      updateTeam: async (name: string, updater: (c: TeamConfig) => TeamConfig) => {
        return ok(updater(structuredClone(config)));
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
      markAllRead: async () => ok(undefined),
    },
  };
}

function resetTracking() {
  deletedInboxes = [];
  deletedTeams = [];
}

describe("core/destroy", () => {
  describe("planDestroy()", () => {
    test("returns error if team doesn't exist", async () => {
      resetTracking();
      const ctx = makeCtx(sampleConfig);
      const result = await planDestroy(ctx, { team: "no-such-team" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });

    test("detects alive agents via registry", async () => {
      resetTracking();
      const registry = makeMockRegistry([
        { agentId: "team-lead@my-team", pid: 111, activatedAt: Date.now() },
        { agentId: "scout@my-team", pid: 222, activatedAt: Date.now() },
      ]);
      const ctx = makeCtx(sampleConfig);

      const result = await planDestroy(ctx, { team: "my-team" }, registry);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(2);
        expect(result.value.inboxes).toHaveLength(2);
      }
    });

    test("only includes alive agents from registry", async () => {
      resetTracking();
      const registry = makeMockRegistry([
        { agentId: "team-lead@my-team", pid: 111, activatedAt: Date.now() },
      ]);
      const ctx = makeCtx(sampleConfig);

      const result = await planDestroy(ctx, { team: "my-team" }, registry);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(1);
        expect(result.value.activeAgents[0].name).toBe("team-lead");
      }
    });

    test("returns no active agents when no registry provided", async () => {
      resetTracking();
      const ctx = makeCtx(sampleConfig);

      const result = await planDestroy(ctx, { team: "my-team" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(0);
      }
    });
  });

  describe("executeDestroy()", () => {
    test("kills agents via registry", async () => {
      resetTracking();
      const registry = makeMockRegistry();
      const ctx = makeCtx(sampleConfig);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [
          { name: "team-lead", agentId: "team-lead@my-team", pid: 111 },
          { name: "scout", agentId: "scout@my-team", pid: 222 },
        ],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan, registry);
      expect(result.ok).toBe(true);
      expect(registry.killed).toEqual(["team-lead@my-team", "scout@my-team"]);
    });

    test("deletes all inbox files", async () => {
      resetTracking();
      const ctx = makeCtx(sampleConfig);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedInboxes).toHaveLength(2);
      expect(deletedInboxes.map((d) => d.agent).sort()).toEqual(["scout", "team-lead"]);
    });

    test("deletes team config", async () => {
      resetTracking();
      const ctx = makeCtx(sampleConfig);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: [],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedTeams).toEqual(["my-team"]);
    });

    test("cleans up process registry", async () => {
      resetTracking();
      const registry = makeMockRegistry();
      const ctx = makeCtx(sampleConfig);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: [],
      };

      const result = await executeDestroy(ctx, plan, registry);
      expect(result.ok).toBe(true);
      expect(registry.cleaned).toEqual(["my-team"]);
    });
  });

  test("planDestroy maps config_not_found to team_not_found", async () => {
    const ctx: AppContext = {
      ...makeCtx(sampleConfig),
      configStore: {
        ...makeCtx(sampleConfig).configStore,
        getTeam: async () =>
          err({ kind: "config_not_found", path: "/fake/path" }),
      },
    };
    const result = await planDestroy(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
