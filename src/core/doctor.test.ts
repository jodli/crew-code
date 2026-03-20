import { describe, expect, test } from "bun:test";
import {
  diagnose,
  applyFixes,
  type DiagnosticResult,
} from "./doctor.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import { ok, err } from "../types/result.ts";

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
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
    },
    ...overrides,
  };
}

function makeMockRegistry(activeEntries: { agentId: string; pid: number }[] = []): ProcessRegistry {
  return {
    async activate() { return ok(undefined); },
    async deactivate() { return ok(undefined); },
    async isAlive(_team, agentId) { return activeEntries.some((e) => e.agentId === agentId); },
    async kill() { return ok(true); },
    async listActive() { return ok(activeEntries.map((e) => ({ ...e, activatedAt: Date.now() }))); },
    async cleanup() { return ok(undefined); },
  };
}

const healthyConfig: TeamConfig = {
  name: "my-team",
  description: "A test team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@my-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "team-lead@my-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      processId: "",
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      processId: "",
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

describe("doctor core", () => {
  describe("diagnose()", () => {
    test("returns clean bill of health when everything is fine", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const failures = results.value.filter((r) => r.status !== "ok");
      expect(failures).toHaveLength(0);
    });

    test("detects orphaned inbox files", async () => {
      const configWithOneMember: TeamConfig = {
        ...healthyConfig,
        members: [healthyConfig.members[0]], // only team-lead
      };

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(configWithOneMember),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "ghost-agent"]),
          readMessages: async () => ok([]),
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const orphanCheck = results.value.find(
        (r) => r.checkId === "orphaned-inbox" && r.detail?.includes("ghost-agent"),
      );
      expect(orphanCheck).toBeDefined();
      expect(orphanCheck!.status).toBe("warn");
      expect(orphanCheck!.fixable).toBe(true);
    });

    test("detects config schema validation errors", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["bad-team"]),
          getTeam: async () =>
            err({
              kind: "schema_validation_failed",
              path: "/home/.claude/teams/bad-team/config.json",
              detail: "missing required field: name",
            }),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok([]),
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const schemaCheck = results.value.find(
        (r) => r.checkId === "config-schema" && r.team === "bad-team",
      );
      expect(schemaCheck).toBeDefined();
      expect(schemaCheck!.status).toBe("error");
    });

    test("detects inbox file with invalid JSON", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async (_team: string, agent: string) => {
            if (agent === "scout") {
              return err({
                kind: "json_parse_failed",
                path: "/home/.claude/teams/my-team/inboxes/scout.json",
                detail: "Unexpected token",
              });
            }
            return ok([]);
          },
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const jsonCheck = results.value.find(
        (r) => r.checkId === "inbox-json" && r.detail?.includes("scout"),
      );
      expect(jsonCheck).toBeDefined();
      expect(jsonCheck!.status).toBe("error");
    });

    test("reports process-registry health when registry is available", async () => {
      const registry = makeMockRegistry([
        { agentId: "team-lead@my-team", pid: process.pid },
      ]);

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        },
        processRegistry: registry,
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const registryCheck = results.value.find(
        (r) => r.checkId === "process-registry",
      );
      expect(registryCheck).toBeDefined();
      expect(registryCheck!.status).toBe("ok");
      expect(registryCheck!.message).toContain("1 active");
    });

    test("scopes to specific team with --team", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["team-a", "team-b"]),
          getTeam: async (name: string) => {
            if (name === "team-a") {
              return ok({ ...healthyConfig, name: "team-a" });
            }
            return ok({ ...healthyConfig, name: "team-b" });
          },
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        },
      });

      const results = await diagnose(ctx, { team: "team-a" });
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const teamBChecks = results.value.filter((r) => r.team === "team-b");
      expect(teamBChecks).toHaveLength(0);
    });
  });

  describe("applyFixes()", () => {
    test("fixes orphaned inbox by calling deleteInbox", async () => {
      let deleteCalled = false;
      const configWithOneMember: TeamConfig = {
        ...healthyConfig,
        members: [healthyConfig.members[0]],
      };

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(configWithOneMember),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "ghost-agent"]),
          readMessages: async () => ok([]),
          deleteInbox: async (_team: string, agent: string) => {
            if (agent === "ghost-agent") deleteCalled = true;
            return ok(undefined);
          },
        },
      });

      const diagResult = await diagnose(ctx, {});
      expect(diagResult.ok).toBe(true);
      if (!diagResult.ok) return;

      const fixResults = await applyFixes(ctx, diagResult.value);
      expect(fixResults.ok).toBe(true);
      expect(deleteCalled).toBe(true);
    });

    test("returns empty fix results when nothing is fixable", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        },
      });

      const diagResult = await diagnose(ctx, {});
      expect(diagResult.ok).toBe(true);
      if (!diagResult.ok) return;

      const fixResults = await applyFixes(ctx, diagResult.value);
      expect(fixResults.ok).toBe(true);
      if (!fixResults.ok) return;
      expect(fixResults.value).toHaveLength(0);
    });
  });
});
