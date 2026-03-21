import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { debounce, watchDir, watchFile } from "./file-watcher.ts";

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

describe("debounce", () => {
  test("coalesces rapid calls into one", async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 100);

    fn();
    fn();
    fn();

    await Bun.sleep(50);
    expect(callCount).toBe(0);

    await Bun.sleep(150);
    expect(callCount).toBe(1);
  });

  test("fires again after debounce window", async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    await Bun.sleep(100);
    expect(callCount).toBe(1);

    fn();
    await Bun.sleep(100);
    expect(callCount).toBe(2);
  });
});
