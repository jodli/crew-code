import { describe, expect, test } from "bun:test";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { listAgents } from "./list-agents.ts";

const sampleConfig: TeamConfig = {
  name: "my-team",
  createdAt: 1773387766070,
  leadAgentId: "lead@my-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "lead@my-team",
      name: "lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

function makeCtx(): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "team_not_found", team: "" }),
      updateTeam: async () => err({ kind: "team_not_found", team: "" }),
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
      markAllRead: async () => ok(undefined),
    },
  };
}

describe("actions/list-agents", () => {
  test("returns enriched members on success", async () => {
    const ctx = makeCtx();
    ctx.configStore.getTeam = async () => ok(sampleConfig);

    const result = await listAgents(ctx, "my-team");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe("lead");
    }
  });

  test("propagates team_not_found error", async () => {
    const ctx = makeCtx();
    const result = await listAgents(ctx, "missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
