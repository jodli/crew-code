import { describe, expect, test } from "bun:test";
import type { Blueprint } from "../config/blueprint-schema.ts";
import type { BlueprintStore } from "../ports/blueprint-store.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { createBlueprint, exportTeamAsBlueprint, getBlueprint, listBlueprints, updateBlueprint } from "./blueprint.ts";

const sampleBlueprint: Blueprint = {
  name: "review-team",
  description: "Code review",
  agents: [
    { name: "lead", agentType: "team-lead" },
    { name: "reviewer", prompt: "Review code" },
  ],
};

function makeBlueprintStore(blueprints: Blueprint[] = []): BlueprintStore & { saved: Blueprint[] } {
  const store = new Map<string, Blueprint>();
  for (const bp of blueprints) store.set(bp.name, bp);
  return {
    saved: blueprints,
    async load(nameOrPath: string) {
      const bp = store.get(nameOrPath);
      if (bp) return ok(structuredClone(bp));
      return err({ kind: "blueprint_not_found", name: nameOrPath });
    },
    async save(blueprint: Blueprint) {
      store.set(blueprint.name, blueprint);
      return ok(`/fake/${blueprint.name}.yaml`);
    },
    async list() {
      return ok([...store.keys()]);
    },
    async exists(name: string) {
      return store.has(name);
    },
  };
}

function makeCtx(blueprints: Blueprint[] = []): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "team_not_found", team: "" }),
      updateTeam: async () => err({ kind: "team_not_found", team: "" }),
      teamExists: async () => false,
      createTeam: async () => ok(undefined),
      listTeams: async () => ok([]),
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
    blueprintStore: makeBlueprintStore(blueprints),
  };
}

describe("listBlueprints", () => {
  test("returns list of blueprint names", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await listBlueprints(ctx);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(["review-team"]);
    }
  });

  test("returns error if blueprintStore not configured", async () => {
    const ctx = makeCtx();
    delete (ctx as { blueprintStore?: unknown }).blueprintStore;

    const result = await listBlueprints(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("launch_failed");
    }
  });
});

describe("getBlueprint", () => {
  test("returns full blueprint for existing name", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await getBlueprint(ctx, "review-team");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("review-team");
      expect(result.value.agents).toHaveLength(2);
    }
  });

  test("returns blueprint_not_found for missing name", async () => {
    const ctx = makeCtx();
    const result = await getBlueprint(ctx, "nonexistent");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_not_found");
    }
  });
});

describe("createBlueprint", () => {
  test("creates and saves valid blueprint", async () => {
    const ctx = makeCtx();
    const result = await createBlueprint(ctx, sampleBlueprint);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("review-team");
    }
  });

  test("returns blueprint_already_exists if name taken", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await createBlueprint(ctx, sampleBlueprint);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_already_exists");
    }
  });

  test("returns blueprint_invalid if schema validation fails", async () => {
    const ctx = makeCtx();
    const invalid = { name: "bad", agents: [] } as unknown as Blueprint;
    const result = await createBlueprint(ctx, invalid);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_invalid");
    }
  });

  test("overwrites existing blueprint when overwrite is true", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await createBlueprint(ctx, sampleBlueprint, { overwrite: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("review-team");
    }
  });
});

describe("updateBlueprint", () => {
  test("updates description on existing blueprint", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await updateBlueprint(ctx, {
      name: "review-team",
      description: "Updated desc",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe("Updated desc");
      expect(result.value.agents).toHaveLength(2);
    }
  });

  test("updates agents list on existing blueprint", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const newAgents = [{ name: "solo", agentType: "team-lead" }];
    const result = await updateBlueprint(ctx, {
      name: "review-team",
      agents: newAgents,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.agents).toHaveLength(1);
      expect(result.value.agents[0].name).toBe("solo");
    }
  });

  test("returns blueprint_not_found for missing name", async () => {
    const ctx = makeCtx();
    const result = await updateBlueprint(ctx, {
      name: "nonexistent",
      description: "x",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_not_found");
    }
  });

  test("returns blueprint_invalid if merged result fails schema", async () => {
    const ctx = makeCtx([sampleBlueprint]);
    const result = await updateBlueprint(ctx, {
      name: "review-team",
      agents: [], // empty agents array violates min(1)
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_invalid");
    }
  });
});

const sampleTeamConfig: TeamConfig = {
  name: "my-team",
  description: "A running team",
  createdAt: 1773387766070,
  leadAgentId: "lead@my-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "lead@my-team",
      name: "lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "dev@my-team",
      name: "dev",
      agentType: "general-purpose",
      model: "opus",
      prompt: "Write code",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

describe("exportTeamAsBlueprint", () => {
  test("exports team as blueprint without saving", async () => {
    const ctx = makeCtx();
    ctx.configStore.getTeam = async (name: string) => {
      if (name === "my-team") return ok(sampleTeamConfig);
      return err({ kind: "team_not_found", team: name });
    };

    const result = await exportTeamAsBlueprint(ctx, { team: "my-team" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("my-team");
      expect(result.value.description).toBe("A running team");
      expect(result.value.agents).toHaveLength(2);
      expect(result.value.agents[1].model).toBe("opus");
      expect(result.value.agents[1].prompt).toBe("Write code");
    }
  });

  test("returns team_not_found for missing team", async () => {
    const ctx = makeCtx();
    const result = await exportTeamAsBlueprint(ctx, { team: "missing" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
