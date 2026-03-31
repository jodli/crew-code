import { debug } from "../lib/logger.ts";

export interface TmuxDeps {
  spawnSync: typeof Bun.spawnSync;
  [key: string]: unknown;
}

const defaultDeps: TmuxDeps = {
  spawnSync: Bun.spawnSync,
};

export function teamSessionName(teamName: string): string {
  return `crew_${teamName}`;
}

export function isTmuxAvailable(deps: TmuxDeps = defaultDeps): boolean {
  const result = deps.spawnSync(["which", "tmux"], { stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0;
}

export function teamSessionExists(teamName: string, deps: TmuxDeps = defaultDeps): boolean {
  const session = teamSessionName(teamName);
  const result = deps.spawnSync(["tmux", "has-session", "-t", session], { stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0;
}

export interface AddPaneOptions {
  teamName: string;
  agentName: string;
  command: string[];
  cwd: string;
}

export interface AddPaneResult {
  pid: number;
  sessionName: string;
  isNewSession: boolean;
}

export function addPaneToTeamSession(options: AddPaneOptions, deps: TmuxDeps = defaultDeps): AddPaneResult {
  const session = teamSessionName(options.teamName);
  const exists = teamSessionExists(options.teamName, deps);

  if (!exists) {
    return createSession(session, options, deps);
  }

  return splitIntoSession(session, options, deps);
}

function createSession(session: string, options: AddPaneOptions, deps: TmuxDeps): AddPaneResult {
  const result = deps.spawnSync(
    ["tmux", "new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", options.cwd, "--", ...options.command],
    { stdout: "pipe", stderr: "pipe" },
  );

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    // Race condition: another process created the session between has-session and new-session
    if (stderr.includes("duplicate session")) {
      debug("tmux", "race condition on new-session, falling back to split-window", { session });
      return splitIntoSession(session, options, deps);
    }
    throw new Error(`Failed to create tmux session "${session}": ${stderr}`);
  }

  setPaneTitle(session, undefined, options.agentName, deps);
  const pid = getSessionPid(session, deps);

  debug("tmux", "created session", { session, agent: options.agentName, pid });
  return { pid, sessionName: session, isNewSession: true };
}

function splitIntoSession(session: string, options: AddPaneOptions, deps: TmuxDeps): AddPaneResult {
  const splitResult = deps.spawnSync(
    ["tmux", "split-window", "-t", session, "-c", options.cwd, "-P", "-F", "#{pane_id}", "--", ...options.command],
    { stdout: "pipe", stderr: "pipe" },
  );

  if (splitResult.exitCode !== 0) {
    const stderr = splitResult.stderr.toString().trim();
    throw new Error(`Failed to split pane in tmux session "${session}": ${stderr}`);
  }

  const paneId = splitResult.stdout.toString().trim();

  setPaneTitle(session, paneId, options.agentName, deps);
  applyLayout(session, deps);
  const pid = getPanePid(session, paneId, deps);

  debug("tmux", "added pane", { session, pane: paneId, agent: options.agentName, pid });
  return { pid, sessionName: session, isNewSession: false };
}

function setPaneTitle(session: string, paneId: string | undefined, title: string, deps: TmuxDeps): void {
  const target = paneId ?? session;
  deps.spawnSync(["tmux", "select-pane", "-t", target, "-T", title], { stdout: "pipe", stderr: "pipe" });
}

function applyLayout(session: string, deps: TmuxDeps): void {
  deps.spawnSync(["tmux", "select-layout", "-t", session, "tiled"], { stdout: "pipe", stderr: "pipe" });
}

function getSessionPid(session: string, deps: TmuxDeps): number {
  const result = deps.spawnSync(["tmux", "list-panes", "-t", session, "-F", "#{pane_pid}"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const pid = Number.parseInt(result.stdout.toString().trim().split("\n")[0], 10);
  if (Number.isNaN(pid)) {
    throw new Error(`Failed to get PID from tmux session "${session}"`);
  }
  return pid;
}

function getPanePid(session: string, paneId: string, deps: TmuxDeps): number {
  const result = deps.spawnSync(["tmux", "list-panes", "-t", session, "-F", "#{pane_id} #{pane_pid}"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const lines = result.stdout.toString().trim().split("\n");
  for (const line of lines) {
    const [id, pidStr] = line.split(" ");
    if (id === paneId) {
      const pid = Number.parseInt(pidStr, 10);
      if (!Number.isNaN(pid)) return pid;
    }
  }
  throw new Error(`Failed to get PID for pane "${paneId}" in session "${session}"`);
}

export async function attachToTeamSession(teamName: string): Promise<number> {
  const session = teamSessionName(teamName);
  const proc = Bun.spawn(["tmux", "attach", "-t", session], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return proc.exited;
}
