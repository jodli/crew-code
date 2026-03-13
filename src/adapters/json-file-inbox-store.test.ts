import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
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

  describe("readMessages()", () => {
    test("returns all messages from inbox file", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      const messages: InboxMessage[] = [
        {
          from: "team-lead",
          text: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          read: false,
        },
        {
          from: "scout",
          text: "Hi back",
          timestamp: "2026-01-01T00:01:00Z",
          read: true,
        },
      ];
      await writeFile(
        join(inboxesDir, "agent1.json"),
        JSON.stringify(messages, null, 2),
      );

      const result = await store.readMessages("test-team", "agent1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].from).toBe("team-lead");
        expect(result.value[1].read).toBe(true);
      }
    });

    test("returns empty array if inbox doesn't exist", async () => {
      const result = await store.readMessages("test-team", "no-such-agent");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("appendMessage()", () => {
    test("adds message to existing inbox", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      const existing: InboxMessage[] = [
        {
          from: "team-lead",
          text: "Hello",
          timestamp: "2026-01-01T00:00:00Z",
          read: true,
        },
      ];
      await writeFile(
        join(inboxesDir, "agent1.json"),
        JSON.stringify(existing, null, 2),
      );

      const newMsg: InboxMessage = {
        from: "external",
        text: "New message",
        timestamp: "2026-01-01T00:05:00Z",
        read: false,
      };

      const result = await store.appendMessage("test-team", "agent1", newMsg);
      expect(result.ok).toBe(true);

      const content = JSON.parse(
        await readFile(join(inboxesDir, "agent1.json"), "utf-8"),
      );
      expect(content).toHaveLength(2);
      expect(content[0].from).toBe("team-lead");
      expect(content[1].from).toBe("external");
      expect(content[1].text).toBe("New message");
    });

    test("creates inbox if it doesn't exist", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });

      const msg: InboxMessage = {
        from: "external",
        text: "First message",
        timestamp: "2026-01-01T00:00:00Z",
        read: false,
      };

      const result = await store.appendMessage("test-team", "new-agent", msg);
      expect(result.ok).toBe(true);

      const path = join(inboxesDir, "new-agent.json");
      expect(existsSync(path)).toBe(true);

      const content = JSON.parse(await readFile(path, "utf-8"));
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe("First message");
    });

    test("does not leave .lock file after append", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      await writeFile(join(inboxesDir, "agent1.json"), "[]");

      const msg: InboxMessage = {
        from: "external",
        text: "Hello",
        timestamp: "2026-01-01T00:00:00Z",
        read: false,
      };

      await store.appendMessage("test-team", "agent1", msg);

      // A leftover .lock file blocks Claude Code from marking messages as read,
      // causing agents to re-process the same message in an infinite loop.
      expect(existsSync(join(inboxesDir, "agent1.json.lock"))).toBe(false);
    });

    test("concurrent appendMessage() calls don't lose data", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      await writeFile(join(inboxesDir, "agent1.json"), "[]");

      const promises = Array.from({ length: 5 }, (_, i) => {
        const msg: InboxMessage = {
          from: "sender",
          text: `Message ${i}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        return store.appendMessage("test-team", "agent1", msg);
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        expect(r.ok).toBe(true);
      }

      const content = JSON.parse(
        await readFile(join(inboxesDir, "agent1.json"), "utf-8"),
      );
      expect(content).toHaveLength(5);
    });
  });

  describe("deleteInbox()", () => {
    test("removes the inbox file", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      await writeFile(join(inboxesDir, "agent1.json"), "[]");

      expect(existsSync(join(inboxesDir, "agent1.json"))).toBe(true);

      const result = await store.deleteInbox("test-team", "agent1");
      expect(result.ok).toBe(true);

      expect(existsSync(join(inboxesDir, "agent1.json"))).toBe(false);
    });

    test("returns ok if inbox file doesn't exist", async () => {
      const result = await store.deleteInbox("test-team", "no-such-agent");
      expect(result.ok).toBe(true);
    });
  });

  describe("listInboxes()", () => {
    test("returns agent names from inbox directory", async () => {
      const inboxesDir = join(tmpDir, "test-team", "inboxes");
      await mkdir(inboxesDir, { recursive: true });
      await writeFile(join(inboxesDir, "agent1.json"), "[]");
      await writeFile(join(inboxesDir, "agent2.json"), "[]");

      const result = await store.listInboxes("test-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sort()).toEqual(["agent1", "agent2"]);
      }
    });

    test("returns empty array if inboxes directory doesn't exist", async () => {
      const result = await store.listInboxes("no-such-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });
  });
});
