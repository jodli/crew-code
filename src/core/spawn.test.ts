import { describe, expect, test, beforeEach } from "bun:test";
import {
  registerAgent,
  activateAgent,
  type RegisterInput,
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
      processId: "",
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

describe("core/registerAgent", () => {

  test("returns team_not_found if team doesn't exist", async () => {
    const ctx = makeCtx({ configStore: makeConfigStore(null) });
    const result = await registerAgent(ctx, {
      team: "no-team",
      task: "work",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns agent_already_exists for duplicate name", async () => {
    const ctx = makeCtx();
    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "team-lead",
      task: "work",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_already_exists");
    }
  });

  test("adds member to config with isActive: false, processId: empty", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "do stuff",
    });

    expect(result.ok).toBe(true);
    expect(configStore.lastUpdated?.members).toHaveLength(2);
    const scout = configStore.lastUpdated?.members.find(
      (m) => m.name === "scout",
    );
    expect(scout).toBeDefined();
    expect(scout?.isActive).toBe(false);
    expect(scout?.processId).toBe("");
  });

  test("seeds inbox with task message", async () => {
    const inboxStore = makeInboxStore();
    const ctx = makeCtx({ inboxStore });
    await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "do stuff",
    });

    expect(inboxStore.created).toHaveLength(1);
    expect(inboxStore.created[0].team).toBe("test-team");
    expect(inboxStore.created[0].agent).toBe("scout");
    expect(inboxStore.created[0].messages).toHaveLength(1);
    expect(inboxStore.created[0].messages![0].text).toBe("do stuff");
    expect(inboxStore.created[0].messages![0].read).toBe(false);
  });

  test("returns launchOptions with correct parentSessionId from config", async () => {
    const ctx = makeCtx();
    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
      model: "opus",
      color: "blue",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.launchOptions.parentSessionId).toBe("abc-123");
      expect(result.value.launchOptions.agentId).toBe("scout@test-team");
      expect(result.value.launchOptions.agentName).toBe("scout");
      expect(result.value.launchOptions.teamName).toBe("test-team");
      expect(result.value.launchOptions.model).toBe("opus");
      expect(result.value.launchOptions.color).toBe("blue");
    }
  });

  test("returns agentId, name, and team", async () => {
    const ctx = makeCtx();
    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentId).toBe("scout@test-team");
      expect(result.value.name).toBe("scout");
      expect(result.value.team).toBe("test-team");
    }
  });

  test("auto-generates name if not provided", async () => {
    const ctx = makeCtx();
    const result = await registerAgent(ctx, {
      team: "test-team",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("agent-1");
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
          joinedAt: 1773387766070,
          processId: "",
          cwd: "/tmp",
          subscriptions: [],
        },
      ],
    };
    const ctx = makeCtx({ configStore: makeConfigStore(configWithAgent3) });
    const result = await registerAgent(ctx, {
      team: "test-team",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("agent-4");
    }
  });

  test("rolls back config if inbox seeding fails", async () => {
    const configStore = makeConfigStore();
    const inboxStore: InboxStore = {
      async createInbox() {
        return err({
          kind: "file_write_failed" as const,
          path: "/fake",
          detail: "boom",
        });
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
    const ctx = makeCtx({ configStore, inboxStore });

    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(false);
    // After rollback, only original member should remain
    expect(configStore.lastUpdated?.members).toHaveLength(1);
    expect(configStore.lastUpdated?.members[0].name).toBe("team-lead");
  });

  test("generates sessionId as UUID and stores on member", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    const scout = configStore.lastUpdated?.members.find(
      (m) => m.name === "scout",
    );
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(scout?.sessionId).toMatch(uuidRegex);
  });

  test("returns launchOptions with sessionId matching stored member sessionId", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    const result = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const scout = configStore.lastUpdated?.members.find(
        (m) => m.name === "scout",
      );
      expect(result.value.launchOptions.sessionId).toBe(scout?.sessionId);
    }
  });
});

describe("core/activateAgent", () => {

  test("updates member's processId and isActive in config", async () => {
    // First register an agent so we have one to activate
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });
    const regResult = await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });
    expect(regResult.ok).toBe(true);

    // Now activate it
    const result = await activateAgent(ctx, "test-team", "scout@test-team", "%42");
    expect(result.ok).toBe(true);

    const scout = configStore.lastUpdated?.members.find(
      (m) => m.name === "scout",
    );
    expect(scout?.processId).toBe("%42");
    expect(scout?.isActive).toBe(true);
  });

  test("only updates the specified agent, leaves others unchanged", async () => {
    // Register two agents
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });

    await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });
    await registerAgent(ctx, {
      team: "test-team",
      name: "worker",
      task: "other work",
    });

    // Activate only scout
    await activateAgent(ctx, "test-team", "scout@test-team", "%42");

    const scout = configStore.lastUpdated?.members.find(
      (m) => m.name === "scout",
    );
    const worker = configStore.lastUpdated?.members.find(
      (m) => m.name === "worker",
    );
    const lead = configStore.lastUpdated?.members.find(
      (m) => m.name === "team-lead",
    );

    expect(scout?.processId).toBe("%42");
    expect(scout?.isActive).toBe(true);

    expect(worker?.processId).toBe("");
    expect(worker?.isActive).toBe(false);

    expect(lead?.processId).toBe("");
  });
});
