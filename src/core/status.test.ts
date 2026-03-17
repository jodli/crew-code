import { describe, expect, test } from "bun:test";
import { listTeams, getTeamDetail, listAgents } from "./status.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";
import type { Result } from "../types/result.ts";

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

const sampleConfig: TeamConfig = {
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
      processId: "%0",
      cwd: "/home/user/repos/project",
      subscriptions: [],
      isActive: true,
      sessionId: "a1824be0-cc35-49a5-8874-fa2aa58cae81",
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      processId: "%1",
      cwd: "/home/user/repos/project",
      subscriptions: [],
      isActive: false,
    },
  ],
};

describe("status core", () => {
  describe("listTeams()", () => {
    test("returns summaries for all teams", async () => {
      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          listTeams: async () => ok(["my-team"]),
          getTeam: async (name: string) => {
            if (name === "my-team") return ok(sampleConfig);
            return err({ kind: "team_not_found", team: name });
          },
        },
      });

      const result = await listTeams(ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe("my-team");
        expect(result.value[0].description).toBe("A test team");
        expect(result.value[0].memberCount).toBe(2);
      }
    });

    test("returns empty array when no teams", async () => {
      const ctx = makeCtx();

      const result = await listTeams(ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("getTeamDetail()", () => {
    test("returns members with unread counts", async () => {
      const messages: InboxMessage[] = [
        {
          from: "team-lead",
          text: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          read: false,
        },
        {
          from: "team-lead",
          text: "Update",
          timestamp: "2026-01-01T00:01:00Z",
          read: true,
        },
        {
          from: "scout",
          text: "Response",
          timestamp: "2026-01-01T00:02:00Z",
          read: false,
        },
      ];

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(sampleConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          readMessages: async (_team: string, agent: string) => {
            if (agent === "team-lead") return ok(messages);
            return ok([]);
          },
        },
      });

      const result = await getTeamDetail(ctx, "my-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("my-team");
        expect(result.value.members).toHaveLength(2);

        const lead = result.value.members.find(
          (m) => m.name === "team-lead",
        )!;
        expect(lead.unreadCount).toBe(2); // two messages with read: false
        expect(lead.sessionId).toBe("a1824be0-cc35-49a5-8874-fa2aa58cae81");
        expect(lead.processId).toBe("%0");
        expect(lead.cwd).toBe("/home/user/repos/project");

        const scout = result.value.members.find((m) => m.name === "scout")!;
        expect(scout.unreadCount).toBe(0);
        expect(scout.sessionId).toBeUndefined();
        expect(scout.processId).toBe("%1");
        expect(scout.cwd).toBe("/home/user/repos/project");
      }
    });

    test("returns error if team not found", async () => {
      const ctx = makeCtx();

      const result = await getTeamDetail(ctx, "no-such-team");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });
  });

  describe("listAgents()", () => {
    test("returns enriched members for valid team", async () => {
      const messages: InboxMessage[] = [
        {
          from: "team-lead",
          text: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          read: false,
        },
        {
          from: "team-lead",
          text: "Update",
          timestamp: "2026-01-01T00:01:00Z",
          read: true,
        },
      ];

      const ctx = makeCtx({
        configStore: {
          ...makeCtx().configStore,
          getTeam: async () => ok(sampleConfig),
        },
        inboxStore: {
          ...makeCtx().inboxStore,
          readMessages: async (_team: string, agent: string) => {
            if (agent === "team-lead") return ok(messages);
            return ok([]);
          },
        },
      });

      const result = await listAgents(ctx, "my-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);

        const lead = result.value.find((m) => m.name === "team-lead")!;
        expect(lead.unreadCount).toBe(1);
        expect(lead.agentId).toBe("team-lead@my-team");

        const scout = result.value.find((m) => m.name === "scout")!;
        expect(scout.unreadCount).toBe(0);
      }
    });

    test("returns team_not_found for missing team", async () => {
      const ctx = makeCtx();

      const result = await listAgents(ctx, "no-such-team");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("team_not_found");
      }
    });
  });
});
