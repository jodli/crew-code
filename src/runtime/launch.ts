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

export interface LaunchOptions extends Partial<LaunchDeps> {
  headless?: boolean;
}

export function launchAgent(info: AgentLaunchInfo, options: LaunchOptions = {}): LaunchResult {
  const { headless, ...depsOverrides } = options;
  const { checkSession } = { ...defaultDeps, ...depsOverrides };
  const mode = selectLaunchMode(info, checkSession);

  const args = buildClaudeArgs(info, mode);

  if (headless) {
    return launchHeadless(info, args);
  }

  return launchInteractive(info, args, mode);
}

function launchInteractive(info: AgentLaunchInfo, args: string[], mode: LaunchMode): LaunchResult {
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

function launchHeadless(info: AgentLaunchInfo, args: string[]): LaunchResult {
  const sessionName = `crew_${info.teamName}_${info.agentName}`;

  // Kill stale tmux session if it exists but the process is dead
  const hasSession = Bun.spawnSync(["tmux", "has-session", "-t", sessionName], { stdout: "pipe", stderr: "pipe" });
  if (hasSession.exitCode === 0) {
    throw new Error(`tmux session "${sessionName}" already exists. Stop the agent first or run: tmux kill-session -t ${sessionName}`);
  }

  const tmuxProc = Bun.spawnSync(
    [
      "tmux",
      "new-session",
      "-d",
      "-s",
      sessionName,
      "-x",
      "200",
      "-y",
      "50",
      "-E",
      "--",
      "env",
      `${CLAUDE_TEAMS_ENV_VAR}=1`,
      "claude",
      ...args,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
      cwd: info.cwd,
      env: { ...process.env, [CLAUDE_TEAMS_ENV_VAR]: "1" },
    },
  );

  if (tmuxProc.exitCode !== 0) {
    const stderr = tmuxProc.stderr.toString().trim();
    throw new Error(`Failed to create tmux session "${sessionName}": ${stderr}`);
  }

  // Get the actual Claude PID from tmux
  const pidProc = Bun.spawnSync(["tmux", "list-panes", "-t", sessionName, "-F", "#{pane_pid}"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const pidStr = pidProc.stdout.toString().trim();
  const claudePid = Number.parseInt(pidStr, 10);

  if (Number.isNaN(claudePid)) {
    throw new Error(`Failed to get PID from tmux session "${sessionName}": ${pidStr}`);
  }

  debug("launch", `started ${info.agentName} headless`, {
    team: info.teamName,
    pid: claudePid,
    tmuxSession: sessionName,
  });

  return { pid: claudePid, exited: new Promise(() => {}) };
}
