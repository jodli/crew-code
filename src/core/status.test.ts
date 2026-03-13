import { describe, expect, test } from "bun:test";
import { listTeams, getTeamDetail } from "./status.ts";
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
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async () => ok([]),
      listInboxes: async () => ok([]),
    },
    launcher: {
      preflight: async () => ok(undefined),
      launch: async () => ok("%0"),
      isAlive: async () => false,
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
        expect(result.value[0].activeCount).toBe(1);
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
        expect(lead.isActive).toBe(true);

        const scout = result.value.members.find((m) => m.name === "scout")!;
        expect(scout.unreadCount).toBe(0);
        expect(scout.isActive).toBe(false);
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
});
