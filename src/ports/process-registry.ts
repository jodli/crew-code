import type { Result } from "../types/result.ts";

export interface RegistryEntry {
  agentId: string;
  pid: number;
  activatedAt: number;
}

export interface ProcessRegistry {
  activate(teamName: string, agentId: string, pid: number): Promise<Result<void>>;
  deactivate(teamName: string, agentId: string): Promise<Result<void>>;
  isRunning(teamName: string, agentId: string): Promise<boolean>;
  stop(teamName: string, agentId: string): Promise<Result<boolean>>;
  listActive(teamName: string): Promise<Result<RegistryEntry[]>>;
  cleanup(teamName: string): Promise<Result<void>>;
}
