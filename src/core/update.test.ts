import { describe, expect, test } from "bun:test";
import { updateTeam, updateAgent } from "./update.ts";
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

const configWithAgents: TeamConfig = {
  name: "my-team",
  createdAt: 1773387766070,
  leadAgentId: "lead@my-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "lead@my-team",
      name: "lead",
      agentType: "team-lead",
      model: "sonnet",
      joinedAt: 1773387766070,
      processId: "%0",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      processId: "%1",
      cwd: "/tmp",
      subscriptions: [],
      isActive: false,
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

describe("updateAgent", () => {
  test("changes model", async () => {
    const ctx = makeCtx(configWithAgents);
    const result = await updateAgent(ctx, { team: "my-team", name: "lead", model: "opus" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe("opus");
      expect(result.value.name).toBe("lead");
    }
  });

  test("changes multiple fields at once", async () => {
    const ctx = makeCtx(configWithAgents);
    const result = await updateAgent(ctx, {
      team: "my-team",
      name: "scout",
      model: "opus",
      color: "blue",
      prompt: "Do stuff",
      extraArgs: ["--verbose"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe("opus");
      expect(result.value.color).toBe("blue");
      expect(result.value.prompt).toBe("Do stuff");
      expect(result.value.extraArgs).toEqual(["--verbose"]);
    }
  });

  test("returns team_not_found for missing team", async () => {
    const ctx = makeCtx();
    const result = await updateAgent(ctx, { team: "missing", name: "lead", model: "opus" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns agent_not_found for missing agent", async () => {
    const ctx = makeCtx(configWithAgents);
    const result = await updateAgent(ctx, { team: "my-team", name: "ghost", model: "opus" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });
});
