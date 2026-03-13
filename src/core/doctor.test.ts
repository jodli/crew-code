import { describe, expect, test } from "bun:test";
import {
  diagnose,
  applyFixes,
  type DiagnosticResult,
  type DiagnoseInput,
} from "./doctor.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
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
    launcher: {
      preflight: async () => ok(undefined),
      launch: async () => ok("%0"),
      isAlive: async () => false,
      kill: async () => ok(undefined),
    },
    ...overrides,
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
      tmuxPaneId: "%0",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      joinedAt: 1773387766070,
      tmuxPaneId: "%1",
      cwd: "/tmp",
      subscriptions: [],
      isActive: false,
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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async (paneId: string) => paneId === "%0", // team-lead is active
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const failures = results.value.filter((r) => r.status !== "ok");
      expect(failures).toHaveLength(0);
    });

    test("detects tmux not installed", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok([]),
        },
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => err({ kind: "tmux_not_installed" }),
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const tmuxCheck = results.value.find((r) => r.checkId === "tmux-installed");
      expect(tmuxCheck).toBeDefined();
      expect(tmuxCheck!.status).toBe("error");
    });

    test("detects tmux server not running", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok([]),
        },
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => err({ kind: "tmux_server_not_running" }),
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const tmuxCheck = results.value.find((r) => r.checkId === "tmux-installed");
      expect(tmuxCheck).toBeDefined();
      expect(tmuxCheck!.status).toBe("warn");
      expect(tmuxCheck!.message).toMatch(/not running/i);
    });

    test("detects stale isActive (pane is gone)", async () => {
      const staleConfig: TeamConfig = {
        ...healthyConfig,
        members: [
          {
            ...healthyConfig.members[0],
            isActive: true,
            tmuxPaneId: "%99", // pane is gone
          },
        ],
      };

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(staleConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead"]),
          readMessages: async () => ok([]),
        },
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async () => false, // pane is gone
        },
      });

      const results = await diagnose(ctx, {});
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      const staleCheck = results.value.find(
        (r) => r.checkId === "stale-active" && r.team === "my-team",
      );
      expect(staleCheck).toBeDefined();
      expect(staleCheck!.status).toBe("warn");
      expect(staleCheck!.fixable).toBe(true);
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
          listInboxes: async () => ok(["team-lead", "ghost-agent"]), // ghost-agent has no member
          readMessages: async () => ok([]),
        },
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async (paneId: string) => paneId === "%0",
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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async (paneId: string) => paneId === "%0",
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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async () => true,
        },
      });

      const results = await diagnose(ctx, { team: "team-a" });
      expect(results.ok).toBe(true);
      if (!results.ok) return;

      // Should only have diagnostics for team-a, plus the tmux check
      const teamBChecks = results.value.filter((r) => r.team === "team-b");
      expect(teamBChecks).toHaveLength(0);
    });
  });

  describe("applyFixes()", () => {
    test("fixes stale isActive by calling updateTeam", async () => {
      let updateCalled = false;
      const staleConfig: TeamConfig = {
        ...healthyConfig,
        members: [
          {
            ...healthyConfig.members[0],
            isActive: true,
            tmuxPaneId: "%99",
          },
        ],
      };

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async () => ok(staleConfig),
          updateTeam: async (_name, updater) => {
            updateCalled = true;
            const updated = updater(staleConfig);
            expect(updated.members[0].isActive).toBe(false);
            return ok(updated);
          },
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          listInboxes: async () => ok(["team-lead"]),
          readMessages: async () => ok([]),
        },
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async () => false,
        },
      });

      const diagResult = await diagnose(ctx, {});
      expect(diagResult.ok).toBe(true);
      if (!diagResult.ok) return;

      const fixResults = await applyFixes(ctx, diagResult.value);
      expect(fixResults.ok).toBe(true);
      expect(updateCalled).toBe(true);
    });

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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async (paneId: string) => paneId === "%0",
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
        launcher: {
          ...makeCtx().launcher,
          preflight: async () => ok(undefined),
          isAlive: async (paneId: string) => paneId === "%0",
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
