import { describe, expect, test } from "bun:test";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";

describe("buildClaudeArgs", () => {
  test("includes required flags: agent-id, agent-name, team-name", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
    });

    expect(args).toContain("--agent-id");
    expect(args).toContain("scout@my-team");
    expect(args).toContain("--agent-name");
    expect(args).toContain("scout");
    expect(args).toContain("--team-name");
    expect(args).toContain("my-team");
  });

  test("returns flags in correct pairs", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
    });

    expect(args).toEqual([
      "--agent-id", "scout@my-team",
      "--agent-name", "scout",
      "--team-name", "my-team",
    ]);
  });

  test("includes optional color flag when provided", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
      color: "blue",
    });

    expect(args).toContain("--agent-color");
    expect(args).toContain("blue");
  });

  test("includes optional parent-session-id flag when provided", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
      parentSessionId: "abc-123",
    });

    expect(args).toContain("--parent-session-id");
    expect(args).toContain("abc-123");
  });

  test("includes optional model flag when provided", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
      model: "claude-opus-4-6",
    });

    expect(args).toContain("--model");
    expect(args).toContain("claude-opus-4-6");
  });

  test("includes all optional flags when all provided", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
      color: "blue",
      parentSessionId: "abc-123",
      model: "claude-opus-4-6",
    });

    expect(args).toEqual([
      "--agent-id", "scout@my-team",
      "--agent-name", "scout",
      "--team-name", "my-team",
      "--agent-color", "blue",
      "--parent-session-id", "abc-123",
      "--model", "claude-opus-4-6",
    ]);
  });

  test("excludes optional flags when not provided", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
    });

    expect(args).not.toContain("--agent-color");
    expect(args).not.toContain("--parent-session-id");
    expect(args).not.toContain("--model");
    expect(args).not.toContain("--session-id");
    expect(args).not.toContain("--resume");
  });

  test("includes --session-id when sessionId provided in new mode (default)", () => {
    const args = buildClaudeArgs({
      agentId: "scout@my-team",
      agentName: "scout",
      teamName: "my-team",
      cwd: "/home/user/repos",
      sessionId: "abc-def-123",
    });

    expect(args).toContain("--session-id");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--resume");
  });

  test("includes --resume when sessionId provided in resume mode", () => {
    const args = buildClaudeArgs(
      {
        agentId: "scout@my-team",
        agentName: "scout",
        teamName: "my-team",
        cwd: "/home/user/repos",
        sessionId: "abc-def-123",
      },
      "resume",
    );

    expect(args).toContain("--resume");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--session-id");
  });
});

describe("CLAUDE_TEAMS_ENV_VAR", () => {
  test("exports the correct env var name", () => {
    expect(CLAUDE_TEAMS_ENV_VAR).toBe("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS");
  });
});
