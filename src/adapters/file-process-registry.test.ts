import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileProcessRegistry } from "./file-process-registry.ts";

let tmpDir: string;
let registry: FileProcessRegistry;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-registry-test-"));
  registry = new FileProcessRegistry({
    registryPath: (teamName: string) =>
      join(tmpDir, teamName, "processes.json"),
    registryDir: (teamName: string) => join(tmpDir, teamName),
  });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("FileProcessRegistry", () => {
  describe("activate()", () => {
    test("creates registry file with entry", async () => {
      const result = await registry.activate("team-a", "scout@team-a", 12345);
      expect(result.ok).toBe(true);

      const raw = await readFile(
        join(tmpDir, "team-a", "processes.json"),
        "utf-8",
      );
      const entries = JSON.parse(raw);
      expect(entries).toHaveLength(1);
      expect(entries[0].agentId).toBe("scout@team-a");
      expect(entries[0].pid).toBe(12345);
      expect(entries[0].activatedAt).toBeGreaterThan(0);
    });

    test("replaces existing entry for same agent", async () => {
      // Use process.pid so entries survive self-healing reads
      await registry.activate("team-a", "scout@team-a", process.pid);
      await registry.activate("team-a", "scout@team-a", process.pid);

      const result = await registry.listActive("team-a");
      expect(result.ok).toBe(true);
      if (result.ok) {
        const scouts = result.value.filter(
          (e) => e.agentId === "scout@team-a",
        );
        expect(scouts).toHaveLength(1);
      }
    });

    test("adds multiple agents", async () => {
      // Use process.pid so entries survive self-healing reads
      await registry.activate("team-a", "scout@team-a", process.pid);
      await registry.activate("team-a", "lead@team-a", process.pid);

      const result = await registry.listActive("team-a");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe("deactivate()", () => {
    test("removes entry from registry", async () => {
      // Use process.pid so remaining entry survives self-healing reads
      await registry.activate("team-a", "scout@team-a", process.pid);
      await registry.activate("team-a", "lead@team-a", process.pid);

      const result = await registry.deactivate("team-a", "scout@team-a");
      expect(result.ok).toBe(true);

      const list = await registry.listActive("team-a");
      expect(list.ok).toBe(true);
      if (list.ok) {
        expect(list.value).toHaveLength(1);
        expect(list.value[0].agentId).toBe("lead@team-a");
      }
    });

    test("succeeds when registry file does not exist", async () => {
      const result = await registry.deactivate("no-team", "agent@no-team");
      expect(result.ok).toBe(true);
    });
  });

  describe("isAlive()", () => {
    test("returns true for current process PID", async () => {
      await registry.activate("team-a", "self@team-a", process.pid);
      const alive = await registry.isAlive("team-a", "self@team-a");
      expect(alive).toBe(true);
    });

    test("returns false for non-existent agent", async () => {
      const alive = await registry.isAlive("team-a", "ghost@team-a");
      expect(alive).toBe(false);
    });

    test("returns false for dead PID (self-healing)", async () => {
      await registry.activate("team-a", "dead@team-a", 99999999);
      const alive = await registry.isAlive("team-a", "dead@team-a");
      expect(alive).toBe(false);
    });
  });

  describe("kill()", () => {
    test("returns false when agent not in registry", async () => {
      const result = await registry.kill("team-a", "ghost@team-a");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });

    test("removes entry from registry after kill", async () => {
      // Use a dead PID so we don't actually kill anything
      await registry.activate("team-a", "dead@team-a", 99999999);
      const result = await registry.kill("team-a", "dead@team-a");
      expect(result.ok).toBe(true);

      const alive = await registry.isAlive("team-a", "dead@team-a");
      expect(alive).toBe(false);
    });
  });

  describe("listActive()", () => {
    test("returns empty array when no registry file", async () => {
      const result = await registry.listActive("no-team");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    test("evicts dead PIDs on read (self-healing)", async () => {
      // Activate with a dead PID and a live PID
      await registry.activate("team-a", "dead@team-a", 99999999);
      await registry.activate("team-a", "self@team-a", process.pid);

      const result = await registry.listActive("team-a");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].agentId).toBe("self@team-a");
      }
    });
  });

  describe("cleanup()", () => {
    test("removes the registry directory", async () => {
      await registry.activate("team-a", "scout@team-a", 111);

      const result = await registry.cleanup("team-a");
      expect(result.ok).toBe(true);

      const { existsSync } = await import("node:fs");
      expect(existsSync(join(tmpDir, "team-a"))).toBe(false);
    });

    test("succeeds when directory does not exist", async () => {
      const result = await registry.cleanup("no-team");
      expect(result.ok).toBe(true);
    });
  });
});
