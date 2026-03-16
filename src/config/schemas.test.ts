import { describe, expect, test } from "bun:test";
import { TeamConfigSchema, InboxSchema } from "./schemas.ts";

describe("config/schemas", () => {
  describe("TeamConfigSchema", () => {
    const validConfig = {
      name: "reverse-eng",
      description: "Team purpose",
      createdAt: 1773387766070,
      leadSessionId: "2dcc5c49-8e44-45f4-a1b4-c8c7829ce7d0",
      members: [
        {
          agentId: "team-lead@reverse-eng",
          name: "team-lead",
          isLead: true,
          model: "claude-opus-4-6",
          joinedAt: 1773387766070,
          processId: "",
          cwd: "/home/user/repos",
          subscriptions: [],
        },
        {
          agentId: "scout@reverse-eng",
          name: "scout",
          model: "claude-opus-4-6",
          prompt: "Initial system prompt for the agent",
          color: "blue",
          planModeRequired: false,
          joinedAt: 1773387801382,
          processId: "%1",
          cwd: "/home/user/repos",
          subscriptions: [],
          isActive: true,
        },
      ],
    };

    test("parses a valid config.json from real Claude output", () => {
      const result = TeamConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("reverse-eng");
        expect(result.data.members).toHaveLength(2);
        expect(result.data.members[1].isActive).toBe(true);
      }
    });

    test("fails when required fields are missing", () => {
      const invalid = { name: "test" };
      const result = TeamConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test("fails when members is not an array", () => {
      const invalid = { ...validConfig, members: "not-array" };
      const result = TeamConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test("accepts extraArgs on agent member", () => {
      const withExtraArgs = {
        ...validConfig,
        members: [
          {
            ...validConfig.members[0],
            extraArgs: ["--verbose", "--effort", "high"],
          },
        ],
      };
      const result = TeamConfigSchema.safeParse(withExtraArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.members[0].extraArgs).toEqual(["--verbose", "--effort", "high"]);
      }
    });

    test("allows optional fields to be missing", () => {
      const minimal = {
        name: "test",
        createdAt: 1234,
        leadSessionId: "abc",
        members: [],
      };
      const result = TeamConfigSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe("InboxSchema", () => {
    test("parses valid inbox messages", () => {
      const messages = [
        {
          from: "team-lead",
          text: "Welcome!",
          timestamp: "2026-03-13T08:10:00.000Z",
          read: false,
        },
        {
          from: "scout",
          text: "Task done!",
          summary: "Task completion",
          timestamp: "2026-03-13T08:15:00.000Z",
          color: "blue",
          read: true,
        },
      ];
      const result = InboxSchema.safeParse(messages);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].read).toBe(false);
        expect(result.data[1].summary).toBe("Task completion");
      }
    });

    test("parses empty inbox", () => {
      const result = InboxSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    test("fails when message is missing required fields", () => {
      const invalid = [{ from: "test" }];
      const result = InboxSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test("fails when read is not a boolean", () => {
      const invalid = [
        {
          from: "test",
          text: "hi",
          timestamp: "2026-01-01T00:00:00Z",
          read: "yes",
        },
      ];
      const result = InboxSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
