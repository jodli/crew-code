import { describe, expect, test } from "bun:test";
import { sendMessage, type SendInput } from "./send.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

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
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
    {
      agentId: "scout@my-team",
      name: "scout",
      agentType: "general-purpose",
      joinedAt: 1773387766070,
      processId: "%1",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
    },
  ],
};

let appendedMessages: { team: string; agent: string; message: InboxMessage }[] =
  [];

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
      readMessages: async () => ok([]),
      listInboxes: async () => ok([]),
      deleteInbox: async () => ok(undefined),
      appendMessage: async (team: string, agent: string, message: InboxMessage) => {
        appendedMessages.push({ team, agent, message });
        return ok(undefined);
      },
    },
    ...overrides,
  };
}

describe("core/send", () => {
  test("writes message to correct agent inbox", async () => {
    appendedMessages = [];
    const ctx = makeCtx();
    const input: SendInput = {
      team: "my-team",
      agent: "scout",
      message: "Hello scout!",
    };

    const result = await sendMessage(ctx, input);
    expect(result.ok).toBe(true);

    expect(appendedMessages).toHaveLength(1);
    expect(appendedMessages[0].team).toBe("my-team");
    expect(appendedMessages[0].agent).toBe("scout");
    expect(appendedMessages[0].message.text).toBe("Hello scout!");
  });

  test("sets timestamp, read: false, and from defaults to 'crew'", async () => {
    appendedMessages = [];
    const before = new Date().toISOString();
    const ctx = makeCtx();

    await sendMessage(ctx, {
      team: "my-team",
      agent: "scout",
      message: "Test",
    });

    const after = new Date().toISOString();
    const msg = appendedMessages[0].message;
    expect(msg.read).toBe(false);
    expect(msg.from).toBe("crew");
    expect(msg.timestamp >= before).toBe(true);
    expect(msg.timestamp <= after).toBe(true);
  });

  test("uses custom from when provided", async () => {
    appendedMessages = [];
    const ctx = makeCtx();

    await sendMessage(ctx, {
      team: "my-team",
      agent: "scout",
      message: "Test",
      from: "user-alice",
    });

    expect(appendedMessages[0].message.from).toBe("user-alice");
  });

  test("returns error if team doesn't exist", async () => {
    const ctx = makeCtx();
    const result = await sendMessage(ctx, {
      team: "no-such-team",
      agent: "scout",
      message: "Hello",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("returns error if agent doesn't exist in team", async () => {
    const ctx = makeCtx();
    const result = await sendMessage(ctx, {
      team: "my-team",
      agent: "no-such-agent",
      message: "Hello",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("agent_not_found");
    }
  });

  test("maps config_not_found to team_not_found", async () => {
    const ctx = makeCtx({
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () =>
          err({ kind: "config_not_found", path: "/fake/path" }),
      },
    });
    const result = await sendMessage(ctx, {
      team: "no-team",
      agent: "scout",
      message: "Hello",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });
});
