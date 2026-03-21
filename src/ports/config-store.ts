import type { TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";

export interface ConfigStore {
  getTeam(name: string): Promise<Result<TeamConfig>>;
  updateTeam(
    name: string,
    updater: (config: TeamConfig) => TeamConfig,
  ): Promise<Result<TeamConfig>>;
  teamExists(name: string): Promise<boolean>;
  createTeam(config: TeamConfig): Promise<Result<void>>;
  listTeams(): Promise<Result<string[]>>;
  deleteTeam(name: string): Promise<Result<void>>;
}
