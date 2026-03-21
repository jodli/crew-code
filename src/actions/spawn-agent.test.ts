import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeInboxStore } from "../test/helpers.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok } from "../types/result.ts";
import { planSpawn, spawnAgent } from "./spawn-agent.ts";

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
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: makeConfigStore({
      updateTeam: async (_n, u) => ok(u(baseConfig)),
    }),
    inboxStore: makeInboxStore(),
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
      configStore: makeConfigStore({
        getTeam: async () => ok(baseConfig),
        updateTeam: async (_n, u) => ok(u(baseConfig)),
      }),
    });

    const result = await spawnAgent(ctx, { team: "t", name: "worker" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("worker");
    }
  });
});
