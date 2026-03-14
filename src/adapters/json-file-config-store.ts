import { existsSync } from "node:fs";
import { readdir, mkdir, rm } from "node:fs/promises";
import { dirname, basename } from "node:path";
import type { ConfigStore } from "../ports/config-store.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import {
  claudeTeamConfigPath as defaultConfigPath,
  claudeTeamsDir as defaultTeamsDir,
} from "../config/paths.ts";
import { TeamConfigSchema } from "../config/schemas.ts";
import { readJson, writeJson, withLock } from "../lib/json-io.ts";

export interface ConfigStoreDeps {
  configPath: (name: string) => string;
  teamsDir: () => string;
}

const defaultDeps: ConfigStoreDeps = {
  configPath: defaultConfigPath,
  teamsDir: defaultTeamsDir,
};

export class JsonFileConfigStore implements ConfigStore {
  private deps: ConfigStoreDeps;

  constructor(deps: Partial<ConfigStoreDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async getTeam(name: string): Promise<Result<TeamConfig>> {
    const path = this.deps.configPath(name);
    return readJson(path, TeamConfigSchema);
  }

  async updateTeam(
    name: string,
    updater: (config: TeamConfig) => TeamConfig,
  ): Promise<Result<TeamConfig>> {
    const path = this.deps.configPath(name);

    const lockResult = await withLock(path, async () => {
      const readResult = await readJson(path, TeamConfigSchema);
      if (!readResult.ok) return readResult;

      const updated = updater(readResult.value);
      const writeResult = await writeJson(path, updated);
      if (!writeResult.ok) {
        return writeResult as Result<never>;
      }

      return ok(updated);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async teamExists(name: string): Promise<boolean> {
    const path = this.deps.configPath(name);
    return existsSync(path);
  }

  async createTeam(config: TeamConfig): Promise<Result<void>> {
    const path = this.deps.configPath(config.name);

    if (existsSync(path)) {
      return err({ kind: "team_already_exists", team: config.name });
    }

    const teamDir = dirname(path);
    const inboxesDir = `${teamDir}/inboxes`;

    try {
      await mkdir(teamDir, { recursive: true });
      await mkdir(inboxesDir, { recursive: true });
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path: teamDir,
        detail: String(e),
      });
    }

    return writeJson(path, config);
  }

  async deleteTeam(name: string): Promise<Result<void>> {
    const path = this.deps.configPath(name);
    if (!existsSync(path)) {
      return err({ kind: "team_not_found", team: name });
    }
    const teamDir = dirname(path);
    try {
      await rm(teamDir, { recursive: true, force: true });
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path: teamDir,
        detail: String(e),
      });
    }
  }

  async listTeams(): Promise<Result<string[]>> {
    const teamsDir = this.deps.teamsDir();

    if (!existsSync(teamsDir)) {
      return ok([]);
    }

    try {
      const entries = await readdir(teamsDir, { withFileTypes: true });
      const teams = entries
        .filter((e) => e.isDirectory() && existsSync(this.deps.configPath(e.name)))
        .map((e) => e.name);
      return ok(teams);
    } catch (e: unknown) {
      return err({
        kind: "file_read_failed",
        path: teamsDir,
        detail: String(e),
      });
    }
  }
}
