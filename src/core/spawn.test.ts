import { describe, expect, test } from "bun:test";
import {
  planSpawn,
  executeSpawn,
  type SpawnPlan,
} from "./spawn.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const baseConfig: TeamConfig = {
  name: "test-team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@test-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "team-lead@test-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,

      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

function makeConfigStore(
  config: TeamConfig | null = baseConfig,
): ConfigStore & { lastUpdated?: TeamConfig } {
  let current = config ? { ...config, members: [...config.members] } : null;
  const store: ConfigStore & { lastUpdated?: TeamConfig } = {
    async getTeam(name: string) {
      if (!current || current.name !== name) {
        return err({ kind: "config_not_found", path: `/fake/${name}` });
      }
      return ok({ ...current, members: [...current.members] });
    },
    async updateTeam(name, updater) {
      if (!current || current.name !== name) {
        return err({ kind: "config_not_found", path: `/fake/${name}` });
      }
      current = updater({ ...current, members: [...current.members] });
      store.lastUpdated = current;
      return ok(current);
    },
    async teamExists(name) {
      return current !== null && current.name === name;
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
  return store;
}

function makeInboxStore(): InboxStore & {
  created: Array<{ team: string; agent: string; messages?: InboxMessage[] }>;
} {
  const store = {
    created: [] as Array<{
      team: string;
      agent: string;
      messages?: InboxMessage[];
    }>,
    async createInbox(team: string, agent: string, messages?: InboxMessage[]) {
      store.created.push({ team, agent, messages });
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
    async markAllRead() {
      return ok(undefined);
    },
  };
  return store;
}

function makeCtx(overrides?: {
  configStore?: ConfigStore;
  inboxStore?: InboxStore;
}): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: overrides?.inboxStore ?? makeInboxStore(),
  };
}

describe("core/planSpawn", () => {
  test("returns team_not_found if team doesn't exist", async () => {
    const ctx = makeCtx({ configStore: makeConfigStore(null) });
    const result = await planSpawn(ctx, { team: "no-team", prompt: "work" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns agent_already_exists for duplicate name", async () => {
    const ctx = makeCtx();
    const result = await planSpawn(ctx, {
      team: "test-team",
      name: "team-lead",
      prompt: "work",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_already_exists");
    }
  });

  test("auto-generates name if not provided", async () => {
    const ctx = makeCtx();
    const result = await planSpawn(ctx, { team: "test-team", prompt: "work" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentName).toBe("agent-1");
      expect(result.value.agentId).toBe("agent-1@test-team");
    }
  });

  test("auto-generates name based on existing agent-N members", async () => {
    const configWithAgent3: TeamConfig = {
      ...baseConfig,
      members: [
        ...baseConfig.members,
        {
          agentId: "agent-3@test-team",
          name: "agent-3",
          agentType: "general-purpose",
          joinedAt: 1773387766070,
    
          cwd: "/tmp",
          subscriptions: [],
        },
      ],
    };
    const ctx = makeCtx({ configStore: makeConfigStore(configWithAgent3) });
    const result = await planSpawn(ctx, { team: "test-team", prompt: "work" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentName).toBe("agent-4");
    }
  });

  test("generates sessionId as UUID", async () => {
    const ctx = makeCtx();
    const result = await planSpawn(ctx, { team: "test-team", name: "scout", prompt: "work" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result.value.sessionId).toMatch(uuidRegex);
    }
  });

  test("includes parentSessionId from team config", async () => {
    const ctx = makeCtx();
    const result = await planSpawn(ctx, { team: "test-team", name: "scout", prompt: "work" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.parentSessionId).toBe("abc-123");
    }
  });

  test("carries model and color through", async () => {
    const ctx = makeCtx();
    const result = await planSpawn(ctx, {
      team: "test-team",
      name: "scout",
      model: "opus",
      color: "blue",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.model).toBe("opus");
      expect(result.value.color).toBe("blue");
    }
  });
});

describe("core/executeSpawn", () => {
  const basePlan: SpawnPlan = {
    team: "test-team",
    agentName: "scout",
    agentId: "scout@test-team",
    cwd: "/tmp",
    sessionId: "test-session-uuid",
    parentSessionId: "abc-123",
    prompt: "do stuff",
    agentType: "general-purpose",
  };

  test("adds member to config", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    const result = await executeSpawn(ctx, basePlan);

    expect(result.ok).toBe(true);
    expect(configStore.lastUpdated?.members).toHaveLength(2);
    const scout = configStore.lastUpdated?.members.find((m) => m.name === "scout");
    expect(scout?.sessionId).toBe("test-session-uuid");
    expect(scout?.agentType).toBe("general-purpose");
  });

  test("persists prompt in config member", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    await executeSpawn(ctx, basePlan);

    const scout = configStore.lastUpdated?.members.find((m) => m.name === "scout");
    expect(scout?.prompt).toBe("do stuff");
  });

  test("seeds inbox with prompt message", async () => {
    const inboxStore = makeInboxStore();
    const ctx = makeCtx({ inboxStore });
    await executeSpawn(ctx, basePlan);

    expect(inboxStore.created).toHaveLength(1);
    expect(inboxStore.created[0].team).toBe("test-team");
    expect(inboxStore.created[0].agent).toBe("scout");
    expect(inboxStore.created[0].messages).toHaveLength(1);
    expect(inboxStore.created[0].messages![0].text).toBe("do stuff");
    expect(inboxStore.created[0].messages![0].read).toBe(false);
  });

  test("does not seed inbox when no prompt", async () => {
    const inboxStore = makeInboxStore();
    const ctx = makeCtx({ inboxStore });
    await executeSpawn(ctx, { ...basePlan, prompt: undefined });

    expect(inboxStore.created[0].messages).toHaveLength(0);
  });

  test("returns launchOptions with correct fields", async () => {
    const ctx = makeCtx();
    const result = await executeSpawn(ctx, { ...basePlan, model: "opus", color: "blue" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.launchOptions.agentId).toBe("scout@test-team");
      expect(result.value.launchOptions.agentName).toBe("scout");
      expect(result.value.launchOptions.teamName).toBe("test-team");
      expect(result.value.launchOptions.parentSessionId).toBe("abc-123");
      expect(result.value.launchOptions.sessionId).toBe("test-session-uuid");
      expect(result.value.launchOptions.model).toBe("opus");
      expect(result.value.launchOptions.color).toBe("blue");
    }
  });

  test("rolls back config if inbox creation fails", async () => {
    const configStore = makeConfigStore();
    const inboxStore: InboxStore = {
      async createInbox() {
        return err({ kind: "file_write_failed" as const, path: "/fake", detail: "boom" });
      },
      async readMessages() { return ok([] as InboxMessage[]); },
      async appendMessage() { return ok(undefined); },
      async listInboxes() { return ok([] as string[]); },
      async deleteInbox() { return ok(undefined); },
    async markAllRead() { return ok(undefined); },
    };
    const ctx = makeCtx({ configStore, inboxStore });
    const result = await executeSpawn(ctx, basePlan);

    expect(result.ok).toBe(false);
    expect(configStore.lastUpdated?.members).toHaveLength(1);
    expect(configStore.lastUpdated?.members[0].name).toBe("team-lead");
  });
});

