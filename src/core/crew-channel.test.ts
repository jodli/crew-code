import { describe, expect, test } from "bun:test";
import { getCrewMessages, markCrewMessagesRead } from "./crew-channel.ts";
import type { AppContext } from "../types/context.ts";
import type { InboxMessage } from "../types/domain.ts";
import { CREW_SENDER } from "../types/constants.ts";
import { ok, err } from "../types/result.ts";

const sampleMessages: InboxMessage[] = [
  {
    from: "peter",
    text: "I'm working on the API endpoints.",
    summary: "Working on API",
    timestamp: "2026-03-21T17:10:00Z",
    read: true,
  },
  {
    from: "team-lead",
    text: "idle",
    summary: "Status: idle",
    timestamp: "2026-03-21T17:09:00Z",
    read: false,
  },
  {
    from: "peter",
    text: "Done with the API endpoints.",
    timestamp: "2026-03-21T17:15:00Z",
    read: false,
  },
];

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "config_not_found", path: "" }),
      updateTeam: async () => err({ kind: "team_not_found", team: "" }),
      teamExists: async (name: string) => name === "my-team",
      createTeam: async () => ok(undefined),
      listTeams: async () => ok(["my-team"]),
      deleteTeam: async () => ok(undefined),
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async (_team: string, agent: string) => {
        if (agent === CREW_SENDER) return ok(sampleMessages);
        return ok([]);
      },
      appendMessage: async () => ok(undefined),
      listInboxes: async () => ok([]),
      deleteInbox: async () => ok(undefined),
    },
    ...overrides,
  };
}

describe("core/crew-channel", () => {
  test("returns all messages for a valid team (oldest first)", async () => {
    const ctx = makeCtx();
    const result = await getCrewMessages(ctx, "my-team");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(3);
      expect(result.value.messages[0].timestamp).toBe("2026-03-21T17:09:00Z");
      expect(result.value.messages[1].timestamp).toBe("2026-03-21T17:10:00Z");
      expect(result.value.messages[2].timestamp).toBe("2026-03-21T17:15:00Z");
    }
  });

  test("returns counts (total + unread)", async () => {
    const ctx = makeCtx();
    const result = await getCrewMessages(ctx, "my-team");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalCount).toBe(3);
      expect(result.value.unreadCount).toBe(2);
      expect(result.value.team).toBe("my-team");
    }
  });

  test("returns team_not_found for missing team", async () => {
    const ctx = makeCtx();
    const result = await getCrewMessages(ctx, "no-such-team");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns empty messages when no crew inbox exists", async () => {
    const ctx = makeCtx({
      inboxStore: {
        ...makeCtx().inboxStore,
        readMessages: async () => ok([]),
      },
    });
    const result = await getCrewMessages(ctx, "my-team");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(0);
      expect(result.value.totalCount).toBe(0);
      expect(result.value.unreadCount).toBe(0);
    }
  });

  test("reads from CREW_SENDER inbox slot", async () => {
    let capturedAgent = "";
    const ctx = makeCtx({
      inboxStore: {
        ...makeCtx().inboxStore,
        readMessages: async (_team: string, agent: string) => {
          capturedAgent = agent;
          return ok([]);
        },
      },
    });

    await getCrewMessages(ctx, "my-team");
    expect(capturedAgent).toBe(CREW_SENDER);
  });

  test("returns only unread messages when unreadOnly: true", async () => {
    const ctx = makeCtx();
    const result = await getCrewMessages(ctx, "my-team", { unreadOnly: true });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.messages).toHaveLength(2);
      expect(result.value.messages.every((m) => !m.read)).toBe(true);
    }
  });

  test("markCrewMessagesRead marks all messages as read", async () => {
    let markAllReadCalled = false;
    let capturedTeam = "";
    let capturedAgent = "";
    const ctx = makeCtx({
      inboxStore: {
        ...makeCtx().inboxStore,
        markAllRead: async (team: string, agent: string) => {
          markAllReadCalled = true;
          capturedTeam = team;
          capturedAgent = agent;
          return ok(undefined);
        },
      },
    });

    const result = await markCrewMessagesRead(ctx, "my-team");
    expect(result.ok).toBe(true);
    expect(markAllReadCalled).toBe(true);
    expect(capturedTeam).toBe("my-team");
    expect(capturedAgent).toBe(CREW_SENDER);
  });

  test("markCrewMessagesRead returns team_not_found for missing team", async () => {
    const ctx = makeCtx();
    const result = await markCrewMessagesRead(ctx, "no-such-team");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
