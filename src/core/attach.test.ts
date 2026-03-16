import { describe, expect, test } from "bun:test";
import { attachAgent } from "./attach.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const baseConfig: TeamConfig = {
  name: "test-team",
  createdAt: 1773387766070,
  leadSessionId: "lead-session-uuid",
  members: [
    {
      agentId: "team-lead@test-team",
      name: "team-lead",
      isLead: true,
      joinedAt: 1773387766070,
      processId: "",
      cwd: "/home/user/repos/project",
      subscriptions: [],
      sessionId: "lead-session-uuid",
    },
    {
      agentId: "scout@test-team",
      name: "scout",
      joinedAt: 1773387770000,
      processId: "",
      cwd: "/home/user/repos/project",
      subscriptions: [],
      isActive: false,
      model: "opus",
      color: "blue",
      sessionId: "scout-session-uuid",
    },
  ],
};

function makeConfigStore(
  config: TeamConfig | null = baseConfig,
): ConfigStore {
  return {
    async getTeam(name: string) {
      if (!config || config.name !== name) {
        return err({ kind: "config_not_found", path: `/fake/${name}` });
      }
      return ok({ ...config, members: [...config.members] });
    },
    async updateTeam() {
      return ok(baseConfig);
    },
    async teamExists(name) {
      return config !== null && config.name === name;
    },
    async createTeam() {
      return ok(undefined);
    },
    async listTeams() {
      return ok([]);
    },
    async deleteTeam() {
      return ok(undefined);
    },
  };
}

function makeInboxStore(): InboxStore {
  return {
    async createInbox() {
      return ok(undefined);
    },
    async readMessages() {
      return ok([] as InboxMessage[]);
    },
    async appendMessage() {
      return ok(undefined);
    },
    async listInboxes() {
      return ok([] as string[]);
    },
    async deleteInbox() {
      return ok(undefined);
    },
  };
}

function makeCtx(overrides?: {
  configStore?: ConfigStore;
}): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: makeInboxStore(),
  };
}

const sessionExists = () => true;

describe("core/attach", () => {
  test("returns launchOptions for existing team-lead", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, { team: "test-team", checkSession: sessionExists });

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
    const result = await attachAgent(ctx, { team: "test-team", checkSession: sessionExists });

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
      checkSession: sessionExists,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.launchOptions.agentId).toBe("scout@test-team");
      expect(result.value.launchOptions.sessionId).toBe("scout-session-uuid");
      expect(result.value.launchOptions.parentSessionId).toBe(
        "lead-session-uuid",
      );
      expect(result.value.launchOptions.model).toBe("opus");
      expect(result.value.launchOptions.color).toBe("blue");
    }
  });

  test("does NOT set parentSessionId for team-lead", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, { team: "test-team", checkSession: sessionExists });

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
          isLead: true,
          joinedAt: 1773387766070,
          processId: "",
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

  test("fails with stale_session when session file does not exist on disk", async () => {
    const ctx = makeCtx();
    const result = await attachAgent(ctx, {
      team: "test-team",
      checkSession: () => false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("stale_session");
    }
  });
});
