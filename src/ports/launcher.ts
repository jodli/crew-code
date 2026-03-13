import type { CrewError } from "../types/errors.ts";
import type { Result } from "../types/result.ts";

export interface LaunchOptions {
  agentId: string;
  agentName: string;
  teamName: string;
  cwd: string;
  color?: string;
  parentSessionId?: string;
  model?: string;
}

export interface Launcher {
  preflight(): Promise<Result<void>>;
  launch(opts: LaunchOptions): Promise<Result<string>>; // returns pane ID
  isAlive(paneId: string): Promise<boolean>;
}
