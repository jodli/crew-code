import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { readJson, withLock, writeJson } from "./json-io.ts";

const TestSchema = z.object({ name: z.string(), value: z.number() });

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("lib/json-io", () => {
  describe("readJson", () => {
    test("reads and validates against schema", async () => {
      const path = join(tmpDir, "test.json");
      await writeFile(path, JSON.stringify({ name: "foo", value: 42 }));

      const result = await readJson(path, TestSchema);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ name: "foo", value: 42 });
      }
    });

    test("returns error on missing file", async () => {
      const result = await readJson(join(tmpDir, "nope.json"), TestSchema);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("config_not_found");
      }
    });

    test("returns error on invalid JSON", async () => {
      const path = join(tmpDir, "bad.json");
      await writeFile(path, "not json{{{");

      const result = await readJson(path, TestSchema);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("json_parse_failed");
      }
    });

    test("returns error on schema mismatch", async () => {
      const path = join(tmpDir, "wrong.json");
      await writeFile(path, JSON.stringify({ name: 123, value: "string" }));

      const result = await readJson(path, TestSchema);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("schema_validation_failed");
      }
    });
  });

  describe("writeJson", () => {
    test("writes atomically (temp + rename)", async () => {
      const path = join(tmpDir, "out.json");
      const data = { name: "bar", value: 7 };

      const result = await writeJson(path, data);
      expect(result.ok).toBe(true);

      const content = await readFile(path, "utf-8");
      expect(JSON.parse(content)).toEqual(data);
    });

    test("overwrites existing file", async () => {
      const path = join(tmpDir, "out.json");
      await writeFile(path, JSON.stringify({ old: true }));

      const result = await writeJson(path, { name: "new", value: 1 });
      expect(result.ok).toBe(true);

      const content = await readFile(path, "utf-8");
      expect(JSON.parse(content)).toEqual({ name: "new", value: 1 });
    });

    test("returns file_write_failed when directory does not exist", async () => {
      const path = join(tmpDir, "no", "such", "dir", "out.json");
      const result = await writeJson(path, { name: "test", value: 1 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("file_write_failed");
      }
    });

    test("cleans up temp directory after write", async () => {
      const path = join(tmpDir, "out.json");
      await writeJson(path, { name: "test", value: 1 });

      const entries = await readdir(tmpDir);
      const tempDirs = entries.filter((e) => e.startsWith(".crew-tmp-"));
      expect(tempDirs).toHaveLength(0);
    });
  });

  describe("withLock", () => {
    test("returns lock_failed when file does not exist", async () => {
      const lockPath = join(tmpDir, "nonexistent.json");
      const result = await withLock(lockPath, async () => "should not run");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("lock_failed");
      }
    });

    test("prevents concurrent writes", async () => {
      const lockPath = join(tmpDir, "lock-target.json");
      await writeFile(lockPath, "{}");

      const order: string[] = [];

      const p1 = withLock(lockPath, async () => {
        order.push("p1-start");
        await new Promise((r) => setTimeout(r, 50));
        order.push("p1-end");
        return "first";
      });

      // Small delay to ensure p1 grabs the lock first
      await new Promise((r) => setTimeout(r, 10));

      const p2 = withLock(lockPath, async () => {
        order.push("p2-start");
        return "second";
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);

      // p1 should complete before p2 starts
      expect(order.indexOf("p1-end")).toBeLessThan(order.indexOf("p2-start"));
    });
  });
});
