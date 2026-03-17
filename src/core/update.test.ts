import { describe, expect, test } from "bun:test";
import { updateTeam } from "./update.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const sampleConfig: TeamConfig = {
  name: "my-team",
  description: "Original description",
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
    },
  };
}

describe("updateTeam", () => {
  test("changes description", async () => {
    const ctx = makeCtx(sampleConfig);
    const result = await updateTeam(ctx, { team: "my-team", description: "New desc" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe("New desc");
      expect(result.value.name).toBe("my-team");
    }
  });

  test("no fields is a no-op, returns current config", async () => {
    const ctx = makeCtx(sampleConfig);
    const result = await updateTeam(ctx, { team: "my-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe("Original description");
    }
  });

  test("returns team_not_found for missing team", async () => {
    const ctx = makeCtx();
    const result = await updateTeam(ctx, { team: "missing", description: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
