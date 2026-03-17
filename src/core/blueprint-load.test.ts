import { describe, expect, test } from "bun:test";
import { planLoad, executeLoad } from "./blueprint-load.ts";
import type { AppContext } from "../types/context.ts";
import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { BlueprintStore } from "../ports/blueprint-store.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

const sampleBlueprint: Blueprint = {
  name: "review-team",
  description: "Code review",
  agents: [
    { name: "team-lead", agentType: "team-lead" },
    { name: "reviewer", prompt: "Review code", model: "opus", color: "red" },
    { name: "checker", prompt: "Check style" },
  ],
};

function makeBlueprintStore(bp?: Blueprint): BlueprintStore {
  return {
    async load(nameOrPath: string) {
      if (bp && (nameOrPath === bp.name || nameOrPath.includes(bp.name))) {
        return ok(bp);
      }
      return err({ kind: "blueprint_not_found", name: nameOrPath });
    },
    async save() { return ok("/fake/path.yaml"); },
    async list() { return ok(bp ? [bp.name] : []); },
    async exists(name) { return bp?.name === name; },
  };
}

function makeConfigStore(): ConfigStore & { teams: Map<string, TeamConfig> } {
  const teams = new Map<string, TeamConfig>();
  return {
    teams,
    async getTeam(name) {
      const t = teams.get(name);
      if (!t) return err({ kind: "config_not_found", path: `/fake/${name}` });
      return ok(structuredClone(t));
    },
    async updateTeam(name, updater) {
      const t = teams.get(name);
      if (!t) return err({ kind: "config_not_found", path: `/fake/${name}` });
      const updated = updater(structuredClone(t));
      teams.set(name, updated);
      return ok(updated);
    },
    async teamExists(name) { return teams.has(name); },
    async createTeam(config) { teams.set(config.name, config); return ok(undefined); },
    async listTeams() { return ok([...teams.keys()]); },
    async deleteTeam(name) { teams.delete(name); return ok(undefined); },
  };
}

function makeInboxStore(): InboxStore & { inboxes: Map<string, InboxMessage[]> } {
  const inboxes = new Map<string, InboxMessage[]>();
  return {
    inboxes,
    async createInbox(team, agent, messages) {
      inboxes.set(`${team}/${agent}`, messages ?? []);
      return ok(undefined);
    },
    async readMessages(team, agent) {
      return ok(inboxes.get(`${team}/${agent}`) ?? []);
    },
    async appendMessage() { return ok(undefined); },
    async listInboxes() { return ok([]); },
    async deleteInbox() { return ok(undefined); },
  };
}

function makeCtx(bp?: Blueprint): AppContext & { configStore: ReturnType<typeof makeConfigStore>; inboxStore: ReturnType<typeof makeInboxStore> } {
  const configStore = makeConfigStore();
  const inboxStore = makeInboxStore();
  return {
    configStore,
    inboxStore,
    blueprintStore: makeBlueprintStore(bp),
  };
}

describe("planLoad", () => {
  test("succeeds with valid blueprint", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const result = await planLoad(ctx, { nameOrPath: "review-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.teamName).toBe("review-team");
      expect(result.value.blueprint).toEqual(sampleBlueprint);
      expect(result.value.createPlan.name).toBe("review-team");
    }
  });

  test("fails if blueprint not found", async () => {
    const ctx = makeCtx();
    const result = await planLoad(ctx, { nameOrPath: "nonexistent" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("blueprint_not_found");
    }
  });

  test("fails if team already exists", async () => {
    const ctx = makeCtx(sampleBlueprint);
    await ctx.configStore.createTeam({
      name: "review-team",
      createdAt: Date.now(),
      leadSessionId: "abc",
      members: [],
    });

    const result = await planLoad(ctx, { nameOrPath: "review-team" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_already_exists");
    }
  });
});

describe("executeLoad", () => {
  test("creates team and spawns all agents", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const plan = await planLoad(ctx, { nameOrPath: "review-team" });
    if (!plan.ok) throw new Error("planLoad failed");

    const result = await executeLoad(ctx, plan.value);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.teamName).toBe("review-team");
      // team-lead + 2 agents = 3 launchOptions
      expect(result.value.launchOptions).toHaveLength(3);
      expect(result.value.launchOptions[0].agentName).toBe("team-lead");
      expect(result.value.launchOptions[1].agentName).toBe("reviewer");
      expect(result.value.launchOptions[2].agentName).toBe("checker");
    }
  });

  test("creates inboxes with prompt for each agent", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const plan = await planLoad(ctx, { nameOrPath: "review-team" });
    if (!plan.ok) throw new Error("planLoad failed");

    await executeLoad(ctx, plan.value);

    // Lead has no prompt, so inbox is empty
    const leadInbox = ctx.inboxStore.inboxes.get("review-team/team-lead");
    expect(leadInbox).toHaveLength(0);

    const reviewerInbox = ctx.inboxStore.inboxes.get("review-team/reviewer");
    expect(reviewerInbox).toHaveLength(1);
    expect(reviewerInbox![0].text).toBe("Review code");

    const checkerInbox = ctx.inboxStore.inboxes.get("review-team/checker");
    expect(checkerInbox).toHaveLength(1);
    expect(checkerInbox![0].text).toBe("Check style");
  });

  test("registers all members in config", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const plan = await planLoad(ctx, { nameOrPath: "review-team" });
    if (!plan.ok) throw new Error("planLoad failed");

    await executeLoad(ctx, plan.value);

    const team = ctx.configStore.teams.get("review-team");
    expect(team?.members).toHaveLength(3);
    expect(team?.members.map((m) => m.name)).toEqual(["team-lead", "reviewer", "checker"]);
  });

  test("persists prompt in config members", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const plan = await planLoad(ctx, { nameOrPath: "review-team" });
    if (!plan.ok) throw new Error("planLoad failed");

    await executeLoad(ctx, plan.value);

    const team = ctx.configStore.teams.get("review-team");
    const reviewer = team?.members.find((m) => m.name === "reviewer");
    expect(reviewer?.prompt).toBe("Review code");
    expect(reviewer?.model).toBe("opus");
    expect(reviewer?.color).toBe("red");
  });
});

describe("planLoad with teamName override", () => {
  test("uses teamName override for team creation", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const result = await planLoad(ctx, { nameOrPath: "review-team", teamName: "custom-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.teamName).toBe("custom-team");
      expect(result.value.createPlan.name).toBe("custom-team");
      // blueprint identity is preserved
      expect(result.value.blueprint.name).toBe("review-team");
    }
  });

  test("agent IDs use the overridden team name", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const result = await planLoad(ctx, { nameOrPath: "review-team", teamName: "custom-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const sp of result.value.spawnPlans) {
        expect(sp.agentId).toContain("@custom-team");
        expect(sp.team).toBe("custom-team");
      }
    }
  });

  test("without teamName uses blueprint.name (existing behavior)", async () => {
    const ctx = makeCtx(sampleBlueprint);
    const result = await planLoad(ctx, { nameOrPath: "review-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.teamName).toBe("review-team");
      expect(result.value.createPlan.name).toBe("review-team");
    }
  });
});
