import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { z } from "zod";
import {
  processRegistryDir as defaultRegistryDir,
  processRegistryPath as defaultRegistryPath,
} from "../config/paths.ts";
import { readJson, withLock, writeJson } from "../lib/json-io.ts";
import { debug, warn } from "../lib/logger.ts";
import type { LaunchMode, ProcessRegistry, RegistryEntry } from "../ports/process-registry.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

const RegistryEntrySchema = z.object({
  agentId: z.string(),
  pid: z.number(),
  activatedAt: z.number(),
  mode: z.enum(["interactive", "headless"]).default("interactive"),
});

const RegistrySchema = z.array(RegistryEntrySchema);

export interface ProcessRegistryDeps {
  registryPath: (teamName: string) => string;
  registryDir: (teamName: string) => string;
}

const defaultDeps: ProcessRegistryDeps = {
  registryPath: defaultRegistryPath,
  registryDir: defaultRegistryDir,
};

function isProcessRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcess(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

export class FileProcessRegistry implements ProcessRegistry {
  private deps: ProcessRegistryDeps;

  constructor(deps: Partial<ProcessRegistryDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async activate(
    teamName: string,
    agentId: string,
    pid: number,
    mode: LaunchMode = "interactive",
  ): Promise<Result<void>> {
    debug("registry", "activate", { team: teamName, agentId, pid, mode });
    const path = this.deps.registryPath(teamName);
    const dir = this.deps.registryDir(teamName);

    try {
      await mkdir(dir, { recursive: true });
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path: dir,
        detail: String(e),
      });
    }

    // Ensure file exists so proper-lockfile can lock it
    if (!existsSync(path)) {
      const initResult = await writeJson(path, []);
      if (!initResult.ok) return initResult;
    }

    const lockResult = await withLock(path, async () => {
      const entries = await this.readEntries(teamName);
      const filtered = entries.filter((e) => e.agentId !== agentId);
      filtered.push({ agentId, pid, activatedAt: Date.now(), mode });
      const writeResult = await writeJson(path, filtered);
      if (!writeResult.ok) return writeResult;
      return ok(undefined);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async deactivate(teamName: string, agentId: string): Promise<Result<void>> {
    debug("registry", "deactivate", { team: teamName, agentId });
    const path = this.deps.registryPath(teamName);
    if (!existsSync(path)) return ok(undefined);

    const lockResult = await withLock(path, async () => {
      const entries = await this.readEntries(teamName);
      const filtered = entries.filter((e) => e.agentId !== agentId);
      const writeResult = await writeJson(path, filtered);
      if (!writeResult.ok) return writeResult;
      return ok(undefined);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async isRunning(teamName: string, agentId: string): Promise<boolean> {
    const entries = await this.readEntriesHealed(teamName);
    const entry = entries.find((e) => e.agentId === agentId);
    return entry !== undefined;
  }

  async stop(teamName: string, agentId: string): Promise<Result<boolean>> {
    debug("registry", "stop", { team: teamName, agentId });
    const path = this.deps.registryPath(teamName);
    if (!existsSync(path)) return ok(false);

    const lockResult = await withLock(path, async () => {
      const entries = await this.readEntries(teamName);
      const entry = entries.find((e) => e.agentId === agentId);
      if (!entry) return ok(false);

      const killed = killProcess(entry.pid);
      const remaining = entries.filter((e) => e.agentId !== agentId);
      const writeResult = await writeJson(path, remaining);
      if (!writeResult.ok) return writeResult as Result<never>;
      return ok(killed);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async listActive(teamName: string): Promise<Result<RegistryEntry[]>> {
    const entries = await this.readEntriesHealed(teamName);
    return ok(entries);
  }

  async cleanup(teamName: string): Promise<Result<void>> {
    const dir = this.deps.registryDir(teamName);
    if (!existsSync(dir)) return ok(undefined);

    try {
      await rm(dir, { recursive: true, force: true });
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path: dir,
        detail: String(e),
      });
    }
  }

  private async readEntries(teamName: string): Promise<RegistryEntry[]> {
    const path = this.deps.registryPath(teamName);
    if (!existsSync(path)) return [];

    const result = await readJson(path, RegistrySchema);
    if (!result.ok) {
      warn("registry", "failed to read entries", { team: teamName, error: result.error.kind });
      return [];
    }
    return result.value as RegistryEntry[];
  }

  private async readEntriesHealed(teamName: string): Promise<RegistryEntry[]> {
    const path = this.deps.registryPath(teamName);
    if (!existsSync(path)) return [];

    const entries = await this.readEntries(teamName);
    const alive = entries.filter((e) => isProcessRunning(e.pid));

    if (alive.length !== entries.length) {
      debug("registry", "healing stale entries", {
        team: teamName,
        removed: entries.length - alive.length,
      });
      const lockResult = await withLock(path, async () => {
        const writeResult = await writeJson(path, alive);
        if (!writeResult.ok) return writeResult;
        return ok(undefined);
      });
      // Best-effort heal: ignore lock/write failures
      void lockResult;
    }

    return alive;
  }
}
