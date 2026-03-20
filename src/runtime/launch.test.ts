import { describe, expect, test } from "bun:test";
import { buildClaudeArgs } from "./claude-args.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";

const base: AgentLaunchInfo = {
  agentId: "scout@my-team",
  agentName: "scout",
  teamName: "my-team",
  cwd: "/home/user/repos",
  sessionId: "abc-def-123",
};

describe("runtime/launch mode detection", () => {
  // launchAgent itself calls Bun.spawn("claude") so we can't run it in tests.
  // Instead we verify the mode-selection logic that launchAgent uses:
  // - session file exists → "resume" → --resume flag
  // - no session file → "new" → --session-id flag

  test("new mode uses --session-id (no prior session)", () => {
    const args = buildClaudeArgs(base, "new");
    expect(args).toContain("--session-id");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--resume");
  });

  test("resume mode uses --resume (session file exists)", () => {
    const args = buildClaudeArgs(base, "resume");
    expect(args).toContain("--resume");
    expect(args).toContain("abc-def-123");
    expect(args).not.toContain("--session-id");
  });

  test("no session flags when sessionId is undefined", () => {
    const args = buildClaudeArgs({ ...base, sessionId: undefined }, "new");
    expect(args).not.toContain("--session-id");
    expect(args).not.toContain("--resume");
  });
});
