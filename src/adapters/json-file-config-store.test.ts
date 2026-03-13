import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonFileConfigStore } from "./json-file-config-store.ts";
import type { TeamConfig } from "../types/domain.ts";

let tmpDir: string;
let store: JsonFileConfigStore;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-cfg-test-"));
  store = new JsonFileConfigStore({
    configPath: (name: string) => join(tmpDir, name, "config.json"),
  });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const sampleConfig: TeamConfig = {
  name: "test-team",
  createdAt: 1773387766070,
  leadAgentId: "team-lead@test-team",
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "team-lead@test-team",
      name: "team-lead",
      agentType: "team-lead",
      joinedAt: 1773387766070,
      tmuxPaneId: "",
      cwd: "/tmp",
      subscriptions: [],
    },
  ],
};

async function writeTeamConfig(name: string, config: TeamConfig) {
  const teamDir = join(tmpDir, name);
  await mkdir(teamDir, { recursive: true });
  await writeFile(
    join(teamDir, "config.json"),
    JSON.stringify(config, null, 2),
  );
}

describe("JsonFileConfigStore", () => {
  describe("getTeam()", () => {
    test("reads and parses config.json", async () => {
      await writeTeamConfig("test-team", sampleConfig);
      const result = await store.getTeam("test-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("test-team");
        expect(result.value.members).toHaveLength(1);
      }
    });

    test("returns error if team doesn't exist", async () => {
      const result = await store.getTeam("no-such-team");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("config_not_found");
      }
    });

    test("returns error if config is corrupt", async () => {
      const teamDir = join(tmpDir, "bad-team");
      await mkdir(teamDir, { recursive: true });
      await writeFile(join(teamDir, "config.json"), "not json{{{");

      const result = await store.getTeam("bad-team");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("json_parse_failed");
      }
    });
  });

  describe("updateTeam()", () => {
    test("applies updater function and writes back", async () => {
      await writeTeamConfig("test-team", sampleConfig);

      const result = await store.updateTeam("test-team", (config) => ({
        ...config,
        description: "Updated description",
      }));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.description).toBe("Updated description");
      }

      // Verify it was persisted
      const readBack = await store.getTeam("test-team");
      expect(readBack.ok).toBe(true);
      if (readBack.ok) {
        expect(readBack.value.description).toBe("Updated description");
      }
    });
  });

  describe("teamExists()", () => {
    test("returns true when team exists", async () => {
      await writeTeamConfig("test-team", sampleConfig);
      expect(await store.teamExists("test-team")).toBe(true);
    });

    test("returns false when team doesn't exist", async () => {
      expect(await store.teamExists("nope")).toBe(false);
    });
  });
});
