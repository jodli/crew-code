import { describe, expect, test } from "bun:test";
import type { ConfigStore } from "../ports/config-store.ts";
import { makeConfigStore as makeBaseConfigStore, makeInboxStore } from "../test/helpers.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { attachAgent } from "./attach.ts";

const baseConfig: TeamConfig = {
  name: "test-team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@test-team",
  leadSessionId: "lead-session-uuid",
  members: [
    {
      agentId: "team-lead@test-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      cwd: "/home/user/repos/project",
      subscriptions: [],
      sessionId: "lead-session-uuid",
    },
    {
      agentId: "scout@test-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387770000,
      cwd: "/home/user/repos/project",
      subscriptions: [],
      model: "opus",
      color: "blue",
      sessionId: "scout-session-uuid",
    },
  ],
};

function makeConfigStore(config: TeamConfig | null = baseConfig): ConfigStore {
  return makeBaseConfigStore({
    getTeam: async (name: string) => {
      if (!config || config.name !== name) {
        return err({ kind: "config_not_found", path: `/fake/${name}` });
      }
      return ok({ ...config, members: [...config.members] });
    },
    updateTeam: async () => ok(baseConfig),
    teamExists: async (name) => config !== null && config.name === name,
  });
}

function makeCtx(overrides?: { configStore?: ConfigStore }): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: makeInboxStore(),
  };
}

describe("core/attach", () => {
  test("returns launchOptions for existing team-lead", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, { team: "test-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentId).toBe("team-lead@test-team");
      expect(result.value.name).toBe("team-lead");
      expect(result.value.team).toBe("test-team");
      expect(result.value.launchOptions.agentId).toBe("team-lead@test-team");
      expect(result.value.launchOptions.agentName).toBe("team-lead");
      expect(result.value.launchOptions.teamName).toBe("test-team");
      expect(result.value.launchOptions.sessionId).toBe("lead-session-uuid");
      expect(result.value.launchOptions.cwd).toBe("/home/user/repos/project");
    }
  });

  test("defaults name to team-lead when not provided", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, { team: "test-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("team-lead");
    }
  });

  test("returns launchOptions for a spawned agent with parentSessionId", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, {
      team: "test-team",
      name: "scout",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.launchOptions.agentId).toBe("scout@test-team");
      expect(result.value.launchOptions.sessionId).toBe("scout-session-uuid");
      expect(result.value.launchOptions.parentSessionId).toBe("lead-session-uuid");
      expect(result.value.launchOptions.model).toBe("opus");
      expect(result.value.launchOptions.color).toBe("blue");
    }
  });

  test("does NOT set parentSessionId for team-lead", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, { team: "test-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.launchOptions.parentSessionId).toBeUndefined();
    }
  });

  test("fails with team_not_found for missing team", async () => {
    const ctx = makeCtx({ configStore: makeConfigStore(null) });
    const result = await attachAgent(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("fails with agent_not_found for missing agent name", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, {
      team: "test-team",
      name: "nonexistent",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });

  test("fails with no_session_id when member has no sessionId", async () => {
    const configWithoutSession: TeamConfig = {
      ...baseConfig,
      members: [
        {
          agentId: "team-lead@test-team",
          name: "team-lead",
          agentType: "team-lead",
          joinedAt: 1773387766070,
          cwd: "/tmp",
          subscriptions: [],
          // no sessionId
        },
      ],
    };
    const ctx = makeCtx({ configStore: makeConfigStore(configWithoutSession) });
    const result = await attachAgent(ctx, { team: "test-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("no_session_id");
    }
  });
});
