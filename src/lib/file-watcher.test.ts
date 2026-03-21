import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { watchFile, watchDir } from "./file-watcher.ts";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-watcher-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("watchFile", () => {
  test("fires callback when file is modified", async () => {
    const filePath = join(tmpDir, "test.json");
    await writeFile(filePath, "[]");

    let callCount = 0;
    const cleanup = watchFile(filePath, () => {
      callCount++;
    });

    try {
      await Bun.sleep(100);
      await writeFile(filePath, '[{"msg": "hello"}]');
      await Bun.sleep(6000); // wait for heartbeat fallback
      expect(callCount).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup();
    }
  }, 10000);

  test("fires callback when file is created", async () => {
    const filePath = join(tmpDir, "new-file.json");

    let callCount = 0;
    const cleanup = watchFile(filePath, () => {
      callCount++;
    });

    try {
      await Bun.sleep(100);
      await writeFile(filePath, "[]");
      await Bun.sleep(6000);
      expect(callCount).toBeGreaterThanOrEqual(1);
    } finally {
      cleanup();
    }
  }, 10000);

  test("cleanup stops watcher", async () => {
    const filePath = join(tmpDir, "test.json");
    await writeFile(filePath, "[]");

    let callCount = 0;
    const cleanup = watchFile(filePath, () => {
      callCount++;
    });

    cleanup();
    await writeFile(filePath, '[{"msg": "after cleanup"}]');
    await Bun.sleep(6000);
    expect(callCount).toBe(0);
  }, 10000);
});

describe("watchDir", () => {
  test("fires callback with filename when file changes", async () => {
    const filePath = join(tmpDir, "agent.json");
    await writeFile(filePath, "[]");

    const changed: string[] = [];
    const cleanup = watchDir(tmpDir, (filename) => {
      changed.push(filename);
    });

    try {
      await Bun.sleep(100);
      await writeFile(filePath, '[{"msg": "hello"}]');
      await Bun.sleep(6000);
      expect(changed.length).toBeGreaterThanOrEqual(1);
      expect(changed).toContain("agent.json");
    } finally {
      cleanup();
    }
  }, 10000);
});
