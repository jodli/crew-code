import { debug, warn } from "../lib/logger.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";
import type { LaunchMode } from "./claude-args.ts";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import { sessionExistsOnDisk } from "./claude-session.ts";

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
  return info.sessionId && checkSession(info.cwd, info.sessionId) ? "resume" : "new";
}

export function launchAgent(info: AgentLaunchInfo, deps: Partial<LaunchDeps> = {}): LaunchResult {
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

  debug("launch", `started ${info.agentName}`, { team: info.teamName, pid: proc.pid, mode });

  const start = Date.now();
  proc.exited.then((code) => {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    if (code === 0) {
      debug("launch", `${info.agentName} exited`, { pid: proc.pid, code, duration: `${duration}s` });
    } else {
      warn("launch", `${info.agentName} exited with non-zero code`, { pid: proc.pid, code, duration: `${duration}s` });
    }
  });

  return { pid: proc.pid, exited: proc.exited };
}
