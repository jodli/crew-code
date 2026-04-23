import { expandHome } from "../lib/expand-home.ts";
import { debug, warn } from "../lib/logger.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";
import type { LaunchMode } from "./claude-args.ts";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import { sessionExistsOnDisk } from "./claude-session.ts";
import { addPaneToTeamSession } from "./tmux-session.ts";

export interface LaunchResult {
  pid: number;
  sessionName?: string;
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
  /** Tmux layout to apply when running headless. Defaults to "tiled". */
  layout?: "tiled" | "main-vertical";
  /** Agent name to place on the left when layout is "main-vertical". Defaults to the first pane (team-lead). */
  mainPane?: string;
}

export function launchAgent(info: AgentLaunchInfo, options: LaunchOptions = {}): LaunchResult {
  const resolved = { ...info, cwd: expandHome(info.cwd) };
  const { headless, layout, mainPane, ...depsOverrides } = options;
  const { checkSession } = { ...defaultDeps, ...depsOverrides };
  const mode = selectLaunchMode(resolved, checkSession);

  const args = buildClaudeArgs(resolved, mode);

  if (headless) {
    return launchHeadless(resolved, args, { layout, mainPane });
  }

  return launchInteractive(resolved, args, mode);
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

function launchHeadless(
  info: AgentLaunchInfo,
  args: string[],
  layoutOptions: { layout?: "tiled" | "main-vertical"; mainPane?: string } = {},
): LaunchResult {
  const command = ["env", `${CLAUDE_TEAMS_ENV_VAR}=1`, "claude", ...args];
  const result = addPaneToTeamSession({
    teamName: info.teamName,
    agentName: info.agentName,
    command,
    cwd: info.cwd,
    layout: layoutOptions.layout,
    mainPane: layoutOptions.mainPane,
  });

  return { pid: result.pid, sessionName: result.sessionName, exited: new Promise(() => {}) };
}
