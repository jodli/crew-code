import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeCtx, makeInboxStore, makeProcessRegistry } from "../test/helpers.ts";
import type { TeamConfig } from "../types/domain.ts";
import { err, ok } from "../types/result.ts";
import { applyFixes, diagnose } from "./doctor.ts";

function makeMockRegistry(activeEntries: { agentId: string; pid: number }[] = []) {
  return makeProcessRegistry({
    isAlive: async (_team, agentId) => activeEntries.some((e) => e.agentId === agentId),
    listActive: async () => ok(activeEntries.map((e) => ({ ...e, activatedAt: Date.now() }))),
  });
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
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

describe("doctor core", () => {
  describe("diagnose()", () => {
    test("returns clean bill of health when everything is fine", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        }),
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
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(configWithOneMember),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "ghost-agent"]),
          readMessages: async () => ok([]),
        }),
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
        configStore: makeConfigStore({
          listTeams: async () => ok(["bad-team"]),
          getTeam: async () =>
            err({
              kind: "schema_validation_failed",
              path: "/home/.claude/teams/bad-team/config.json",
              detail: "missing required field: name",
            }),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok([]),
        }),
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const schemaCheck = results.value.find((r) => r.checkId === "config-schema" && r.team === "bad-team");
      expect(schemaCheck).toBeDefined();
      expect(schemaCheck!.status).toBe("error");
    });

    test("detects non-schema config read failures", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          listTeams: async () => ok(["broken-team"]),
          getTeam: async () =>
            err({
              kind: "file_read_failed",
              path: "/home/.claude/teams/broken-team/config.json",
              detail: "EACCES: permission denied",
            }),
        }),
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const check = results.value.find((r) => r.checkId === "config-schema" && r.team === "broken-team");
      expect(check).toBeDefined();
      expect(check!.status).toBe("error");
      expect(check!.message).toContain("Cannot read config");
      expect(check!.detail).toBe("file_read_failed");
    });

    test("detects inbox file with invalid JSON", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        }),
        inboxStore: makeInboxStore({
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
        }),
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const jsonCheck = results.value.find((r) => r.checkId === "inbox-json" && r.detail?.includes("scout"));
      expect(jsonCheck).toBeDefined();
      expect(jsonCheck!.status).toBe("error");
    });

    test("reports process-registry health when registry is available", async () => {
      const registry = makeMockRegistry([{ agentId: "team-lead@my-team", pid: process.pid }]);

      const ctx = makeCtx({
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        }),
        processRegistry: registry,
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const registryCheck = results.value.find((r) => r.checkId === "process-registry");
      expect(registryCheck).toBeDefined();
      expect(registryCheck!.status).toBe("ok");
      expect(registryCheck!.message).toContain("1 active");
    });

    test("scopes to specific team with --team", async () => {
      const ctx = makeCtx({
        configStore: makeConfigStore({
          listTeams: async () => ok(["team-a", "team-b"]),
          getTeam: async (name: string) => {
            if (name === "team-a") {
              return ok({ ...healthyConfig, name: "team-a" });
            }
            return ok({ ...healthyConfig, name: "team-b" });
          },
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        }),
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
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(configWithOneMember),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "ghost-agent"]),
          readMessages: async () => ok([]),
          deleteInbox: async (_team: string, agent: string) => {
            if (agent === "ghost-agent") deleteCalled = true;
            return ok(undefined);
          },
        }),
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
        configStore: makeConfigStore({
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(healthyConfig),
        }),
        inboxStore: makeInboxStore({
          listInboxes: async () => ok(["team-lead", "scout"]),
          readMessages: async () => ok([]),
        }),
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
