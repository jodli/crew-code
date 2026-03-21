import { describe, expect, test } from "bun:test";
import type { AgentLaunchInfo } from "../types/domain.ts";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";

const base: AgentLaunchInfo = {
  agentId: "scout@my-team",
  agentName: "scout",
  teamName: "my-team",
  cwd: "/home/user/repos",
};

describe("runtime/buildClaudeArgs", () => {
  test("includes required flags: agent-id, agent-name, team-name", () => {
    const args = buildClaudeArgs(base);
    expect(args).toEqual(["--agent-id", "scout@my-team", "--agent-name", "scout", "--team-name", "my-team"]);
  });

  test("includes optional color flag when provided", () => {
    const args = buildClaudeArgs({ ...base, color: "blue" });
    expect(args).toContain("--agent-color");
    expect(args).toContain("blue");
  });

  test("includes optional parent-session-id flag when provided", () => {
    const args = buildClaudeArgs({ ...base, parentSessionId: "abc-123" });
    expect(args).toContain("--parent-session-id");
    expect(args).toContain("abc-123");
  });

  test("includes optional model flag when provided", () => {
    const args = buildClaudeArgs({ ...base, model: "claude-opus-4-6" });
    expect(args).toContain("--model");
    expect(args).toContain("claude-opus-4-6");
  });

  test("includes --agent-type flag when provided", () => {
    const args = buildClaudeArgs({ ...base, agentType: "team-lead" });
    expect(args).toContain("--agent-type");
    expect(args).toContain("team-lead");
  });

  test("includes --session-id in new mode (default)", () => {
    const args = buildClaudeArgs({ ...base, sessionId: "abc-def-123" });
    expect(args).toContain("--session-id");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--resume");
  });

  test("includes --resume in resume mode", () => {
    const args = buildClaudeArgs({ ...base, sessionId: "abc-def-123" }, "resume");
    expect(args).toContain("--resume");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--session-id");
  });

  test("appends extraArgs at the end", () => {
    const args = buildClaudeArgs({
      ...base,
      extraArgs: ["--verbose", "--effort", "high"],
    });
    expect(args).toEqual([
      "--agent-id",
      "scout@my-team",
      "--agent-name",
      "scout",
      "--team-name",
      "my-team",
      "--verbose",
      "--effort",
      "high",
    ]);
  });

  test("does not append anything when extraArgs is empty", () => {
    const args = buildClaudeArgs({ ...base, extraArgs: [] });
    expect(args).toEqual(["--agent-id", "scout@my-team", "--agent-name", "scout", "--team-name", "my-team"]);
  });
});

describe("CLAUDE_TEAMS_ENV_VAR", () => {
  test("exports the correct env var name", () => {
    expect(CLAUDE_TEAMS_ENV_VAR).toBe("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS");
  });
});
