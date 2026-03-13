import { existsSync } from "node:fs";
import type { ConfigStore } from "../ports/config-store.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { claudeTeamConfigPath as defaultConfigPath } from "../config/paths.ts";
import { TeamConfigSchema } from "../config/schemas.ts";
import { readJson, writeJson, withLock } from "../lib/json-io.ts";

export interface ConfigStoreDeps {
  configPath: (name: string) => string;
}

const defaultDeps: ConfigStoreDeps = {
  configPath: defaultConfigPath,
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
}
