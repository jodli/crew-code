import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { JsonFileInboxStore } from "./json-file-inbox-store.ts";
import type { InboxMessage } from "../types/domain.ts";

let tmpDir: string;
let store: JsonFileInboxStore;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-inbox-test-"));
  store = new JsonFileInboxStore({
    inboxesDir: (team: string) => join(tmpDir, team, "inboxes"),
    inboxPath: (team: string, agent: string) =>
      join(tmpDir, team, "inboxes", `${agent}.json`),
  });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("JsonFileInboxStore", () => {
  describe("createInbox()", () => {
    test("creates inbox file with initial messages", async () => {
      await mkdir(join(tmpDir, "test-team"), { recursive: true });
      const messages: InboxMessage[] = [
        {
          from: "team-lead",
          text: "Welcome!",
          timestamp: new Date().toISOString(),
          read: false,
        },
      ];

      const result = await store.createInbox("test-team", "scout", messages);
      expect(result.ok).toBe(true);

      const path = join(tmpDir, "test-team", "inboxes", "scout.json");
      expect(existsSync(path)).toBe(true);

      const content = JSON.parse(await readFile(path, "utf-8"));
      expect(content).toHaveLength(1);
      expect(content[0].from).toBe("team-lead");
      expect(content[0].read).toBe(false);
    });

    test("creates empty inbox if no messages", async () => {
      await mkdir(join(tmpDir, "test-team"), { recursive: true });

      const result = await store.createInbox("test-team", "scout");
      expect(result.ok).toBe(true);

      const path = join(tmpDir, "test-team", "inboxes", "scout.json");
      const content = JSON.parse(await readFile(path, "utf-8"));
      expect(content).toEqual([]);
    });

    test("creates inboxes directory if it doesn't exist", async () => {
      await mkdir(join(tmpDir, "test-team"), { recursive: true });

      await store.createInbox("test-team", "agent1");

      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      expect(existsSync(inboxesDir)).toBe(true);
    });
  });
});
