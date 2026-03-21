import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeInboxStore } from "../test/helpers.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok } from "../types/result.ts";
import { removeAgent } from "./remove-agent.ts";

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
    {
      agentId: "worker@t",
      name: "worker",
      agentType: "general-purpose",
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

describe("actions/remove-agent", () => {
  test("propagates plan error (agent_not_found)", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () => ok(baseConfig),
      }),
    });

    const result = await removeAgent(ctx, { team: "t", name: "ghost" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });

  test("returns ok on success", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () => ok(baseConfig),
        updateTeam: async (_n, u) => ok(u(baseConfig)),
      }),
    });

    const result = await removeAgent(ctx, { team: "t", name: "worker" });
    expect(result.ok).toBe(true);
  });
});
