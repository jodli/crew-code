import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { claudeSessionPath, sessionExistsOnDisk } from "./claude-session.ts";

describe("lib/claude-session", () => {
  describe("claudeSessionPath()", () => {
    test("encodes a basic path correctly", () => {
      const result = claudeSessionPath(
        "/mnt/quickstuff/git/crew-code",
        "abc-123",
      );
      expect(result).toEndWith(
        "/.claude/projects/-mnt-quickstuff-git-crew-code/abc-123.jsonl",
      );
    });

    test("encodes dots in path as dashes", () => {
      const result = claudeSessionPath(
        "/home/user/.config/nvim",
        "def-456",
      );
      expect(result).toEndWith(
        "/.claude/projects/-home-user--config-nvim/def-456.jsonl",
      );
    });
  });

  describe("sessionExistsOnDisk()", () => {
    const tmpDir = join("/tmp", "claude-session-test-" + process.pid);
    const fakeCwd = join(tmpDir, "project");
    const fakeSessionId = "test-session-000";

    test("returns true when session file exists", () => {
      // Create the expected directory structure manually
      const sessionPath = claudeSessionPath(fakeCwd, fakeSessionId);
      const dir = sessionPath.substring(0, sessionPath.lastIndexOf("/"));
      mkdirSync(dir, { recursive: true });
      writeFileSync(sessionPath, "");

      expect(sessionExistsOnDisk(fakeCwd, fakeSessionId)).toBe(true);

      rmSync(tmpDir, { recursive: true, force: true });
    });

    test("returns false when session file does not exist", () => {
      expect(
        sessionExistsOnDisk("/tmp/nonexistent-project-xyz", "no-such-session"),
      ).toBe(false);
    });
  });
});
