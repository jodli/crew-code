import { describe, expect, test } from "bun:test";
import { planCreate, executeCreate, type CreatePlan } from "./create.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";
import { makeConfigStore as makeBaseConfigStore, makeInboxStore } from "../test/helpers.ts";

let createdConfig: TeamConfig | undefined;

function makeConfigStore(opts?: { exists: boolean }): ConfigStore {
  const exists = opts?.exists ?? false;
  return makeBaseConfigStore({
    teamExists: async () => exists,
    createTeam: async (config: TeamConfig) => {
      if (exists) return err({ kind: "team_already_exists", team: config.name });
      createdConfig = config;
      return ok(undefined);
    },
  });
}

function makeCtx(overrides?: { configStore?: ConfigStore }): AppContext {
  return {
    configStore: overrides?.configStore ?? makeConfigStore(),
    inboxStore: makeInboxStore(),
  };
}

describe("core/planCreate", () => {
  test("returns error if team already exists", async () => {
    const ctx = makeCtx({ configStore: makeConfigStore({ exists: true }) });
    const result = await planCreate(ctx, { name: "existing-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_already_exists");
    }
  });

  test("returns plan with team name and description", async () => {
    const ctx = makeCtx();
    const result = await planCreate(ctx, { name: "my-team", description: "A test team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("my-team");
      expect(result.value.description).toBe("A test team");
    }
  });

  test("generates leadSessionId as a UUID", async () => {
    const ctx = makeCtx();
    const result = await planCreate(ctx, { name: "my-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result.value.leadSessionId).toMatch(uuidRegex);
    }
  });
});

describe("core/executeCreate", () => {
  const basePlan: CreatePlan = {
    name: "my-team",
    description: "A test team",
    leadSessionId: "lead-uuid-123",
  };

  test("creates team config with correct structure", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    await executeCreate(ctx, basePlan);

    expect(createdConfig).toBeDefined();
    expect(createdConfig!.name).toBe("my-team");
    expect(createdConfig!.description).toBe("A test team");
    expect(createdConfig!.leadSessionId).toBe("lead-uuid-123");
  });

  test("creates team with empty members list", async () => {
    createdConfig = undefined;
    const ctx = makeCtx();
    await executeCreate(ctx, basePlan);

    expect(createdConfig!.members).toHaveLength(0);
  });

  test("returns team name and leadSessionId", async () => {
    const ctx = makeCtx();
    const result = await executeCreate(ctx, basePlan);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("my-team");
      expect(result.value.leadSessionId).toBe("lead-uuid-123");
    }
  });
});
