import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeInboxStore } from "../test/helpers.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok } from "../types/result.ts";
import { createAgent, planCreateAgent } from "./create-agent.ts";

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

describe("actions/create-agent", () => {
  test("re-exports planCreateAgent for pre-validation", () => {
    expect(typeof planCreateAgent).toBe("function");
  });

  test("createAgent propagates plan error", async () => {
    const ctx = makeCtx();
    const result = await createAgent(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("createAgent returns ok on success", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () => ok(baseConfig),
        updateTeam: async (_n, u) => ok(u(baseConfig)),
      }),
    });

    const result = await createAgent(ctx, { team: "t", name: "worker" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("worker");
    }
  });
});
