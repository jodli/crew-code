import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { claudeSessionPath, sessionExistsOnDisk } from "./claude-session.ts";

describe("runtime/claude-session", () => {
  describe("claudeSessionPath()", () => {
    test("encodes cwd by replacing slashes and dots with dashes", () => {
      const path = claudeSessionPath("/home/user/repos/my.project", "abc-123");
      expect(path).toBe(join(homedir(), ".claude", "projects", "-home-user-repos-my-project", "abc-123.jsonl"));
    });

    test("handles root cwd", () => {
      const path = claudeSessionPath("/", "sess-1");
      expect(path).toBe(join(homedir(), ".claude", "projects", "-", "sess-1.jsonl"));
    });

    test("handles deeply nested path", () => {
      const path = claudeSessionPath("/a/b/c/d", "id");
      expect(path).toBe(join(homedir(), ".claude", "projects", "-a-b-c-d", "id.jsonl"));
    });
  });

  describe("sessionExistsOnDisk()", () => {
    test("returns false for non-existent session", () => {
      expect(sessionExistsOnDisk("/tmp", "does-not-exist-abc-123")).toBe(false);
    });
  });
});
