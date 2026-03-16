import { describe, expect, test } from "bun:test";
import { planSpawn, spawnAgent } from "./spawn-agent.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const baseConfig: TeamConfig = {
  name: "t",
  createdAt: 0,
  leadAgentId: "team-lead@t",
  leadSessionId: "x",
  members: [
    {
      agentId: "team-lead@t",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 0,
      processId: "",
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      updateTeam: async (_n, u) => ok(u(baseConfig)),
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

describe("actions/spawn-agent", () => {
  test("re-exports planSpawn for pre-validation", () => {
    expect(typeof planSpawn).toBe("function");
  });

  test("spawnAgent propagates plan error", async () => {
    const ctx = makeCtx();
    const result = await spawnAgent(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("spawnAgent returns ok on success", async () => {
    const ctx = makeCtx({
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () => ok(baseConfig),
      },
    });

    const result = await spawnAgent(ctx, { team: "t", name: "worker" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("worker");
    }
  });
});
