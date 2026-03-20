import type { AgentLaunchInfo } from "../types/domain.ts";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import { sessionExistsOnDisk } from "./claude-session.ts";
import type { LaunchMode } from "./claude-args.ts";

export interface LaunchResult {
  pid: number;
  exited: Promise<number>;
}

export interface LaunchDeps {
  checkSession: (cwd: string, sessionId: string) => boolean;
}

const defaultDeps: LaunchDeps = {
  checkSession: sessionExistsOnDisk,
};

export function selectLaunchMode(
  info: AgentLaunchInfo,
  checkSession: (cwd: string, sessionId: string) => boolean,
): LaunchMode {
  return info.sessionId && checkSession(info.cwd, info.sessionId)
    ? "resume"
    : "new";
}

export function launchAgent(
  info: AgentLaunchInfo,
  deps: Partial<LaunchDeps> = {},
): LaunchResult {
  const { checkSession } = { ...defaultDeps, ...deps };
  const mode = selectLaunchMode(info, checkSession);

  const args = buildClaudeArgs(info, mode);
  const proc = Bun.spawn(["claude", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    cwd: info.cwd,
    env: { ...process.env, [CLAUDE_TEAMS_ENV_VAR]: "1" },
  });

  return { pid: proc.pid, exited: proc.exited };
}
