import { describe, expect, test } from "bun:test";
import { buildClaudeArgs } from "../lib/claude-args.ts";
import type { TeamConfig, LaunchOptions } from "../types/domain.ts";

/**
 * These tests ensure our config.json structure matches what Claude Code's
 * native agent teams protocol expects. If these fail, agents will misbehave
 * (e.g. infinite idle loops, broken message routing).
 *
 * Reference: native config captured from `~/.claude/teams/native-test/config.json`
 * created by Claude Code v2.1.76 with CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
 */
describe("protocol conformance", () => {
  const config: TeamConfig = {
    name: "test-team",
    createdAt: Date.now(),
    leadAgentId: "team-lead@test-team",
    leadSessionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    members: [
      {
        agentId: "team-lead@test-team",
        name: "team-lead",
        agentType: "team-lead",
        joinedAt: Date.now(),
        processId: "",
        cwd: "/tmp",
        subscriptions: [],
      },
      {
        agentId: "worker@test-team",
        name: "worker",
        agentType: "general-purpose",
        prompt: "Do work",
        joinedAt: Date.now(),
        processId: "",
        cwd: "/tmp",
        subscriptions: [],
      },
    ],
  };

  test("TeamConfig has leadAgentId field", () => {
    expect(config).toHaveProperty("leadAgentId");
    expect(config.leadAgentId).toBe("team-lead@test-team");
  });

  test("TeamConfig has leadSessionId field", () => {
    expect(config).toHaveProperty("leadSessionId");
    expect(config.leadSessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("lead member has agentType 'team-lead'", () => {
    const lead = config.members.find((m) => m.name === "team-lead");
    expect(lead).toBeDefined();
    expect(lead!.agentType).toBe("team-lead");
  });

  test("worker member has agentType 'general-purpose'", () => {
    const worker = config.members.find((m) => m.name === "worker");
    expect(worker).toBeDefined();
    expect(worker!.agentType).toBe("general-purpose");
  });

  test("members do NOT have deprecated isLead field", () => {
    for (const member of config.members) {
      expect(member).not.toHaveProperty("isLead");
    }
  });

  test("members use prompt field (not systemPrompt)", () => {
    const worker = config.members.find((m) => m.name === "worker");
    expect(worker).toHaveProperty("prompt");
    expect(worker).not.toHaveProperty("systemPrompt");
  });

  test("CLI args include --agent-type for worker", () => {
    const opts: LaunchOptions = {
      agentId: "worker@test-team",
      agentName: "worker",
      teamName: "test-team",
      cwd: "/tmp",
      parentSessionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      sessionId: "11111111-2222-3333-4444-555555555555",
      agentType: "general-purpose",
    };
    const args = buildClaudeArgs(opts);
    expect(args).toContain("--agent-type");
    expect(args).toContain("general-purpose");
  });

  test("CLI args include --agent-type for lead", () => {
    const opts: LaunchOptions = {
      agentId: "team-lead@test-team",
      agentName: "team-lead",
      teamName: "test-team",
      cwd: "/tmp",
      sessionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      agentType: "team-lead",
    };
    const args = buildClaudeArgs(opts);
    expect(args).toContain("--agent-type");
    expect(args).toContain("team-lead");
  });

  test("CLI args do NOT include --parent-session-id for lead", () => {
    const opts: LaunchOptions = {
      agentId: "team-lead@test-team",
      agentName: "team-lead",
      teamName: "test-team",
      cwd: "/tmp",
      sessionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      agentType: "team-lead",
    };
    const args = buildClaudeArgs(opts);
    expect(args).not.toContain("--parent-session-id");
  });
});
