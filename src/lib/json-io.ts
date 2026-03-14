import { readFile, writeFile, rename, mkdtemp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { z } from "zod";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export async function readJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<Result<T>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return err({ kind: "config_not_found", path });
    }
    return err({
      kind: "file_read_failed",
      path,
      detail: String(e),
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: unknown) {
    return err({
      kind: "json_parse_failed",
      path,
      detail: String(e),
    });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return err({
      kind: "schema_validation_failed",
      path,
      detail: result.error.message,
    });
  }

  return ok(result.data);
}

export async function writeJson(
  path: string,
  data: unknown,
): Promise<Result<void>> {
  try {
    const tmpDir = await mkdtemp(join(dirname(path), ".crew-tmp-"));
    const tmpPath = join(tmpDir, "tmp.json");
    await writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    await rename(tmpPath, path);
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return ok(undefined);
  } catch (e: unknown) {
    return err({
      kind: "file_write_failed",
      path,
      detail: String(e),
    });
  }
}

export async function withLock<T>(
  lockPath: string,
  fn: () => Promise<T>,
): Promise<Result<T>> {
  const { lock } = await import("proper-lockfile");
  let release: (() => Promise<void>) | undefined;
  try {
    release = await lock(lockPath, { retries: 3, stale: 10000 });
  } catch (e: unknown) {
    return err({
      kind: "lock_failed",
      path: lockPath,
      detail: String(e),
    });
  }

  try {
    const result = await fn();
    return ok(result);
  } finally {
    if (release) {
      await release().catch(() => {});
    }
  }
}
