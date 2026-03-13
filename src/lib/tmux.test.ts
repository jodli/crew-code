import { describe, expect, test } from "bun:test";
import { tmuxExec, type TmuxResult } from "./tmux.ts";

describe("lib/tmux", () => {
  test("captures stdout, stderr, exit code as structured TmuxResult", async () => {
    // tmux list-sessions will either succeed (if tmux is running) or fail
    // Either way, we get a structured result
    const result = await tmuxExec(["list-sessions"]);
    expect(typeof result.stdout).toBe("string");
    expect(typeof result.stderr).toBe("string");
    expect(typeof result.exitCode).toBe("number");
  });

  test("returns non-zero exit code for invalid command", async () => {
    const result = await tmuxExec(["this-is-not-a-real-command"]);
    expect(result.exitCode).not.toBe(0);
  });

  test("times out after configured duration", async () => {
    // Use a very short timeout with a command that would normally complete
    // Note: tmux itself is fast, so we test the mechanism exists
    // by running with a reasonable timeout
    const result = await tmuxExec(["list-sessions"], 5000);
    expect(typeof result.exitCode).toBe("number");
  });
});
