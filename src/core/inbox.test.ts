import { describe, expect, test } from "bun:test";
import { getInbox } from "./inbox.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";
import { makeConfigStore } from "../test/helpers.ts";

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
      cwd: "/tmp",
      subscriptions: [],
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      color: "blue",
      joinedAt: 1773387766070,
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

const sampleMessages: InboxMessage[] = [
  {
    from: "team-lead",
    text: "Please research the API endpoints.",
    summary: "Research API",
    timestamp: "2026-03-14T10:00:00Z",
    read: true,
  },
  {
    from: "team-lead",
    text: "Also check the auth flow.",
    timestamp: "2026-03-14T10:05:00Z",
    read: false,
  },
  {
    from: "planner",
    text: "Here's the updated plan for the sprint.",
    timestamp: "2026-03-14T10:12:00Z",
    color: "green",
    read: false,
  },
];

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (name === "my-team") return ok(sampleConfig);
        return err({ kind: "team_not_found", team: name });
      },
      updateTeam: async () => err({ kind: "team_not_found", team: "" }),
      teamExists: async (name: string) => name === "my-team",
      createTeam: async () => ok(undefined),
      listTeams: async () => ok(["my-team"]),
      deleteTeam: async () => ok(undefined),
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async (_team: string, agent: string) => {
        if (agent === "scout") return ok(sampleMessages);
        return ok([]);
      },
      appendMessage: async () => ok(undefined),
      listInboxes: async () => ok([]),
      deleteInbox: async () => ok(undefined),
      markAllRead: async () => ok(undefined),
    },
    ...overrides,
  };
}

describe("core/inbox", () => {
  test("returns all messages for a valid team/agent (oldest first)", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "my-team", "scout");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(3);
      // oldest first
      expect(result.value.messages[0].timestamp).toBe("2026-03-14T10:00:00Z");
      expect(result.value.messages[1].timestamp).toBe("2026-03-14T10:05:00Z");
      expect(result.value.messages[2].timestamp).toBe("2026-03-14T10:12:00Z");
    }
  });

  test("returns only unread messages when unreadOnly: true", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "my-team", "scout", {
      unreadOnly: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(2);
      expect(result.value.messages.every((m) => !m.read)).toBe(true);
    }
  });

  test("returns counts (total + unread) alongside messages", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "my-team", "scout");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalCount).toBe(3);
      expect(result.value.unreadCount).toBe(2);
      expect(result.value.team).toBe("my-team");
      expect(result.value.agent).toBe("scout");
    }
  });

  test("returns team_not_found error for missing team", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "no-such-team", "scout");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns agent_not_found error for missing agent", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "my-team", "no-such-agent");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });

  test("returns empty messages for agent with no inbox messages", async () => {
    const ctx = makeCtx();
    const result = await getInbox(ctx, "my-team", "team-lead");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(0);
      expect(result.value.totalCount).toBe(0);
      expect(result.value.unreadCount).toBe(0);
    }
  });

  test("maps config_not_found to team_not_found", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () =>
          err({ kind: "config_not_found", path: "/fake/path" }),
      }),
    });
    const result = await getInbox(ctx, "no-team", "scout");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
