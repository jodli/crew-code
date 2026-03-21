import { describe, expect, test } from "bun:test";
import { updateAgent } from "./update-agent.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

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

function makeCtx(team?: TeamConfig): AppContext {
  let stored = team ? structuredClone(team) : undefined;
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (stored && stored.name === name) return ok(structuredClone(stored));
        return err({ kind: "team_not_found", team: name });
      },
      updateTeam: async (name: string, updater: (c: TeamConfig) => TeamConfig) => {
        if (!stored || stored.name !== name) return err({ kind: "team_not_found", team: name });
        stored = updater(structuredClone(stored));
        return ok(structuredClone(stored));
      },
      teamExists: async () => !!stored,
      createTeam: async () => ok(undefined),
      listTeams: async () => ok(stored ? [stored.name] : []),
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

describe("actions/update-agent", () => {
  test("returns updated agent on success", async () => {
    const ctx = makeCtx(sampleConfig);
    const result = await updateAgent(ctx, { team: "my-team", name: "lead", model: "opus" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe("opus");
    }
  });

  test("propagates agent_not_found error", async () => {
    const ctx = makeCtx(sampleConfig);
    const result = await updateAgent(ctx, { team: "my-team", name: "ghost", model: "opus" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });
});
