import { describe, expect, test } from "bun:test";
import { buildClaudeArgs } from "./claude-args.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";

// We can't easily test launchAgent itself (it calls Bun.spawn with "claude"),
// but we can test the mode-detection logic by testing buildClaudeArgs with
// the mode that launchAgent would pick.

const base: AgentLaunchInfo = {
  agentId: "scout@my-team",
  agentName: "scout",
  teamName: "my-team",
  cwd: "/home/user/repos",
  sessionId: "abc-def-123",
};

describe("runtime/launch mode detection", () => {
  test("new mode uses --session-id when no session file exists", () => {
    // launchAgent would pick "new" when checkSession returns false
    const args = buildClaudeArgs(base, "new");
    expect(args).toContain("--session-id");
    expect(args).not.toContain("--resume");
  });

  test("resume mode uses --resume when session file exists", () => {
    // launchAgent would pick "resume" when checkSession returns true
    const args = buildClaudeArgs(base, "resume");
    expect(args).toContain("--resume");
    expect(args).not.toContain("--session-id");
  });
});
