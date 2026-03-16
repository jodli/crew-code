import { describe, expect, test } from "bun:test";
import {
  planDestroy,
  executeDestroy,
  type DestroyInput,
  type DestroyPlan,
} from "./destroy.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

function makeSampleConfig(processIds: { lead: string; scout: string }): TeamConfig {
  return {
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
        processId: processIds.lead,
        cwd: "/tmp",
        subscriptions: [],
        isActive: true,
      },
      {
        agentId: "scout@my-team",
        name: "scout",
        agentType: "general-purpose",
        joinedAt: 1773387766070,
        processId: processIds.scout,
        cwd: "/tmp",
        subscriptions: [],
        isActive: true,
      },
    ],
  };
}

let deletedInboxes: { team: string; agent: string }[] = [];
let deletedTeams: string[] = [];

function makeCtx(config: TeamConfig): AppContext {
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (name === "my-team") return ok(structuredClone(config));
        return err({ kind: "team_not_found", team: name });
      },
      updateTeam: async (name: string, updater: (c: TeamConfig) => TeamConfig) => {
        return ok(updater(structuredClone(config)));
      },
      teamExists: async (name: string) => name === "my-team",
      createTeam: async () => ok(undefined),
      listTeams: async () => ok(["my-team"]),
      deleteTeam: async (name: string) => {
        deletedTeams.push(name);
        return ok(undefined);
      },
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async () => ok([]),
      listInboxes: async () => ok(["team-lead", "scout"]),
      appendMessage: async () => ok(undefined),
      deleteInbox: async (team: string, agent: string) => {
        deletedInboxes.push({ team, agent });
        return ok(undefined);
      },
    },
  };
}

function resetTracking() {
  deletedInboxes = [];
  deletedTeams = [];
}

describe("core/destroy", () => {
  describe("planDestroy()", () => {
    test("returns error if team doesn't exist", async () => {
      resetTracking();
      const config = makeSampleConfig({ lead: "", scout: "" });
      const ctx = makeCtx(config);
      const result = await planDestroy(ctx, { team: "no-such-team" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });

    test("detects alive processes as active agents", async () => {
      resetTracking();
      // Spawn real processes to detect
      const proc1 = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });
      const proc2 = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });

      const config = makeSampleConfig({
        lead: String(proc1.pid),
        scout: String(proc2.pid),
      });
      const ctx = makeCtx(config);

      const result = await planDestroy(ctx, { team: "my-team" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(2);
        expect(result.value.inboxes).toHaveLength(2);
      }

      proc1.kill();
      proc2.kill();
    });

    test("only includes alive agents in activeAgents", async () => {
      resetTracking();
      const proc = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });

      const config = makeSampleConfig({
        lead: String(proc.pid),
        scout: "99999999", // dead PID
      });
      const ctx = makeCtx(config);

      const result = await planDestroy(ctx, { team: "my-team" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.activeAgents).toHaveLength(1);
        expect(result.value.activeAgents[0].name).toBe("team-lead");
      }

      proc.kill();
    });
  });

  describe("executeDestroy()", () => {
    test("kills all active agents via PID", async () => {
      resetTracking();
      const proc1 = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });
      const proc2 = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });

      const config = makeSampleConfig({ lead: "", scout: "" });
      const ctx = makeCtx(config);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [
          { name: "team-lead", processId: String(proc1.pid) },
          { name: "scout", processId: String(proc2.pid) },
        ],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);

      // Processes should be dead now
      await Bun.sleep(100);
      try { process.kill(proc1.pid, 0); expect(true).toBe(false); } catch { /* expected */ }
      try { process.kill(proc2.pid, 0); expect(true).toBe(false); } catch { /* expected */ }
    });

    test("deletes all inbox files", async () => {
      resetTracking();
      const config = makeSampleConfig({ lead: "", scout: "" });
      const ctx = makeCtx(config);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: ["team-lead", "scout"],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedInboxes).toHaveLength(2);
      expect(deletedInboxes.map((d) => d.agent).sort()).toEqual([
        "scout",
        "team-lead",
      ]);
    });

    test("deletes team config", async () => {
      resetTracking();
      const config = makeSampleConfig({ lead: "", scout: "" });
      const ctx = makeCtx(config);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [],
        inboxes: [],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
      expect(deletedTeams).toEqual(["my-team"]);
    });

    test("handles already-dead agents gracefully", async () => {
      resetTracking();
      const config = makeSampleConfig({ lead: "", scout: "" });
      const ctx = makeCtx(config);
      const plan: DestroyPlan = {
        team: "my-team",
        activeAgents: [{ name: "team-lead", processId: "99999999" }],
        inboxes: [],
      };

      const result = await executeDestroy(ctx, plan);
      expect(result.ok).toBe(true);
    });
  });

  test("planDestroy maps config_not_found to team_not_found", async () => {
    const config = makeSampleConfig({ lead: "", scout: "" });
    const ctx: AppContext = {
      ...makeCtx(config),
      configStore: {
        ...makeCtx(config).configStore,
        getTeam: async () =>
          err({ kind: "config_not_found", path: "/fake/path" }),
      },
    };
    const result = await planDestroy(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
