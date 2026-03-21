import { describe, expect, test } from "bun:test";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { updateTeam } from "./update-team.ts";

const sampleConfig: TeamConfig = {
  name: "my-team",
  description: "Test",
  createdAt: 1773387766070,
  leadAgentId: "lead@my-team",
  leadSessionId: "abc-123",
  members: [],
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

describe("actions/update-team", () => {
  test("returns updated config on success", async () => {
    const ctx = makeCtx(sampleConfig);
    const result = await updateTeam(ctx, { team: "my-team", description: "Updated" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe("Updated");
    }
  });

  test("propagates team_not_found error", async () => {
    const ctx = makeCtx();
    const result = await updateTeam(ctx, { team: "missing" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
