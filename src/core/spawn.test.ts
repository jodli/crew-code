import { describe, expect, test, beforeEach } from "bun:test";
import {
  spawn,
  registerAgent,
  activateAgent,
  resetNameCounter,
  type SpawnInput,
  type RegisterInput,
} from "./spawn.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { Launcher } from "../ports/launcher.ts";
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
      tmuxPaneId: "",
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

function makeLauncher(
  preflightOk = true,
  launchPaneId = "%5",
): Launcher & { launchedWith?: unknown } {
  const launcher: Launcher & { launchedWith?: unknown } = {
    async preflight() {
      return preflightOk
        ? ok(undefined)
        : err({ kind: "tmux_not_installed" as const });
    },
    async launch(opts) {
      launcher.launchedWith = opts;
      return ok(launchPaneId);
    },
    async isAlive() {
      return true;
    },
    async kill() {
      return ok(undefined);
    },
  };
  return launcher;
}

function makeCtx(overrides?: {
  configStore?: ConfigStore;
  inboxStore?: InboxStore;
  launcher?: Launcher;
}): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: overrides?.inboxStore ?? makeInboxStore(),
    launcher: overrides?.launcher ?? makeLauncher(),
  };
}

describe("core/spawn", () => {
  beforeEach(() => {
    resetNameCounter();
  });

  test("runs preflight before anything else", async () => {
    const order: string[] = [];
    const ctx = makeCtx({
      launcher: {
        async preflight() {
          order.push("preflight");
          return err({ kind: "tmux_not_installed" as const });
        },
        async launch() {
          order.push("launch");
          return ok("%1");
        },
        async isAlive() {
          return true;
        },
        async kill() {
          return ok(undefined);
        },
      },
      configStore: {
        ...makeConfigStore(),
        async getTeam() {
          order.push("getTeam");
          return ok(baseConfig);
        },
      } as ConfigStore,
    });

    const result = await spawn(ctx, { team: "test-team", task: "hello" });
    expect(result.ok).toBe(false);
    expect(order).toEqual(["preflight"]);
  });

  test("adds member to config via updateTeam", async () => {
    const configStore = makeConfigStore();
    const ctx = makeCtx({ configStore });

    const result = await spawn(ctx, {
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
    expect(scout?.isActive).toBe(true);
    expect(scout?.tmuxPaneId).toBe("%5");
  });

  test("seeds inbox with task as initial message", async () => {
    const inboxStore = makeInboxStore();
    const ctx = makeCtx({ inboxStore });

    await spawn(ctx, { team: "test-team", name: "scout", task: "do stuff" });

    expect(inboxStore.created).toHaveLength(1);
    expect(inboxStore.created[0].team).toBe("test-team");
    expect(inboxStore.created[0].agent).toBe("scout");
    expect(inboxStore.created[0].messages).toHaveLength(1);
    expect(inboxStore.created[0].messages![0].text).toBe("do stuff");
    expect(inboxStore.created[0].messages![0].read).toBe(false);
  });

  test("launches via launcher, records pane ID, sets isActive: true", async () => {
    const launcher = makeLauncher(true, "%99");
    const configStore = makeConfigStore();
    const ctx = makeCtx({ launcher, configStore });

    const result = await spawn(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.paneId).toBe("%99");
    }

    const scout = configStore.lastUpdated?.members.find(
      (m) => m.name === "scout",
    );
    expect(scout?.tmuxPaneId).toBe("%99");
    expect(scout?.isActive).toBe(true);
  });

  test("generates agent ID as {name}@{team}", async () => {
    const ctx = makeCtx();
    const result = await spawn(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agentId).toBe("scout@test-team");
    }
  });

  test("auto-generates agent name if not provided", async () => {
    const ctx = makeCtx();
    const result = await spawn(ctx, { team: "test-team", task: "work" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("agent-1");
      expect(result.value.agentId).toBe("agent-1@test-team");
    }
  });

  test("returns error if team doesn't exist", async () => {
    const ctx = makeCtx({ configStore: makeConfigStore(null) });
    const result = await spawn(ctx, { team: "no-team", task: "work" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns error if agent name is taken", async () => {
    const ctx = makeCtx();
    const result = await spawn(ctx, {
      team: "test-team",
      name: "team-lead",
      task: "work",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_already_exists");
    }
  });

  test("rolls back config on launch failure", async () => {
    const configStore = makeConfigStore();
    const launcher: Launcher = {
      async preflight() {
        return ok(undefined);
      },
      async launch() {
        return err({ kind: "launch_failed" as const, detail: "boom" });
      },
      async isAlive() {
        return false;
      },
      async kill() {
        return ok(undefined);
      },
    };
    const ctx = makeCtx({ configStore, launcher });

    const result = await spawn(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(result.ok).toBe(false);
    // After rollback, only original member should remain
    expect(configStore.lastUpdated?.members).toHaveLength(1);
    expect(configStore.lastUpdated?.members[0].name).toBe("team-lead");
  });
});

describe("core/registerAgent", () => {
  beforeEach(() => {
    resetNameCounter();
  });

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

  test("adds member to config with isActive: false, tmuxPaneId: empty", async () => {
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
    expect(scout?.tmuxPaneId).toBe("");
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

  test("does NOT call launcher", async () => {
    const launcher = makeLauncher();
    const ctx = makeCtx({ launcher });

    await registerAgent(ctx, {
      team: "test-team",
      name: "scout",
      task: "work",
    });

    expect(launcher.launchedWith).toBeUndefined();
  });
});

describe("core/activateAgent", () => {
  beforeEach(() => {
    resetNameCounter();
  });

  test("updates member's tmuxPaneId and isActive in config", async () => {
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
    expect(scout?.tmuxPaneId).toBe("%42");
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

    expect(scout?.tmuxPaneId).toBe("%42");
    expect(scout?.isActive).toBe(true);

    expect(worker?.tmuxPaneId).toBe("");
    expect(worker?.isActive).toBe(false);

    expect(lead?.tmuxPaneId).toBe("");
  });
});
