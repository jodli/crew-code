import { describe, expect, test } from "bun:test";
import { removeAgent } from "./remove-agent.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const baseConfig: TeamConfig = {
  name: "t",
  createdAt: 0,
  leadSessionId: "x",
  members: [
    {
      agentId: "team-lead@t",
      name: "team-lead",
      isLead: true,
      joinedAt: 0,
      processId: "",
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "worker@t",
      name: "worker",
      joinedAt: 0,
      processId: "99999999",
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

describe("actions/remove-agent", () => {
  test("propagates plan error (agent_not_found)", async () => {
    const ctx = makeCtx({
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () => ok(baseConfig),
      },
    });

    const result = await removeAgent(ctx, { team: "t", name: "ghost" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });

  test("returns ok on success", async () => {
    const ctx = makeCtx({
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () => ok(baseConfig),
      },
    });

    const result = await removeAgent(ctx, { team: "t", name: "worker" });
    expect(result.ok).toBe(true);
  });
});
