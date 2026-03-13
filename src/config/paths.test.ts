import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  claudeTeamsDir,
  claudeTeamDir,
  claudeTeamConfigPath,
  claudeInboxesDir,
  claudeInboxPath,
} from "./paths.ts";

const home = homedir();

describe("config/paths", () => {
  test("claudeTeamsDir() returns ~/.claude/teams", () => {
    expect(claudeTeamsDir()).toBe(join(home, ".claude", "teams"));
  });

  test("claudeTeamDir(name) returns ~/.claude/teams/{name}", () => {
    expect(claudeTeamDir("my-team")).toBe(
      join(home, ".claude", "teams", "my-team"),
    );
  });

  test("claudeTeamConfigPath(name) returns ~/.claude/teams/{name}/config.json", () => {
    expect(claudeTeamConfigPath("my-team")).toBe(
      join(home, ".claude", "teams", "my-team", "config.json"),
    );
  });

  test("claudeInboxesDir(name) returns ~/.claude/teams/{name}/inboxes", () => {
    expect(claudeInboxesDir("my-team")).toBe(
      join(home, ".claude", "teams", "my-team", "inboxes"),
    );
  });

  test("claudeInboxPath(name, agent) returns ~/.claude/teams/{name}/inboxes/{agent}.json", () => {
    expect(claudeInboxPath("my-team", "scout")).toBe(
      join(home, ".claude", "teams", "my-team", "inboxes", "scout.json"),
    );
  });
});
