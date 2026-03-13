import { describe, expect, test } from "bun:test";
import { createTeam, type CreateInput } from "./create.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { Launcher } from "../ports/launcher.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

let createdConfig: TeamConfig | undefined;

function makeConfigStore(opts?: {
  exists: boolean;
}): ConfigStore {
  const exists = opts?.exists ?? false;
  return {
    async getTeam() {
      return err({ kind: "config_not_found", path: "/fake" });
    },
    async updateTeam() {
      return err({ kind: "config_not_found", path: "/fake" });
    },
    async teamExists() {
      return exists;
    },
    async createTeam(config: TeamConfig) {
      if (exists) {
        return err({ kind: "team_already_exists", team: config.name });
      }
      createdConfig = config;
      return ok(undefined);
    },
    async listTeams() {
      return ok([]);
    },
  };
}

function makeInboxStore(): InboxStore {
  return {
    async createInbox() {
      return ok(undefined);
    },
  };
}

function makeLauncher(): Launcher {
  return {
    async preflight() {
      return ok(undefined);
    },
    async launch() {
      return ok("%1");
    },
    async isAlive() {
      return true;
    },
  };
}

function makeCtx(overrides?: {
  configStore?: ConfigStore;
}): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: makeInboxStore(),
    launcher: makeLauncher(),
  };
}

describe("core/create", () => {
  test("creates team with name and description", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    const result = await createTeam(ctx, {
      name: "my-team",
      description: "A test team",
    });

    expect(result.ok).toBe(true);
    expect(createdConfig).toBeDefined();
    expect(createdConfig!.name).toBe("my-team");
    expect(createdConfig!.description).toBe("A test team");
  });

  test("creates team-lead member entry", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    await createTeam(ctx, { name: "my-team" });

    expect(createdConfig!.members).toHaveLength(1);
    const lead = createdConfig!.members[0];
    expect(lead.name).toBe("team-lead");
    expect(lead.agentType).toBe("team-lead");
    expect(lead.tmuxPaneId).toBe("");
    expect(lead.subscriptions).toEqual([]);
  });

  test("generates leadAgentId as team-lead@{name}", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    await createTeam(ctx, { name: "my-team" });

    expect(createdConfig!.leadAgentId).toBe("team-lead@my-team");
    expect(createdConfig!.members[0].agentId).toBe("team-lead@my-team");
  });

  test("generates leadSessionId as a UUID", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    await createTeam(ctx, { name: "my-team" });

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(createdConfig!.leadSessionId).toMatch(uuidRegex);
  });

  test("sets createdAt timestamp", async () => {
    createdConfig = undefined;
    const before = Date.now();
    const ctx = makeCtx();
    await createTeam(ctx, { name: "my-team" });
    const after = Date.now();

    expect(createdConfig!.createdAt).toBeGreaterThanOrEqual(before);
    expect(createdConfig!.createdAt).toBeLessThanOrEqual(after);
  });

  test("returns error if team already exists", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({ exists: true }),
    });
    const result = await createTeam(ctx, { name: "existing-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_already_exists");
    }
  });

  test("returns team name and leadAgentId on success", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    const result = await createTeam(ctx, { name: "my-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("my-team");
      expect(result.value.leadAgentId).toBe("team-lead@my-team");
    }
  });
});
