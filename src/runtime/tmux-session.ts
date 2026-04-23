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

// tmux target formats:
//   target-session: =name     (exact match, for has-session, attach, list-panes -s)
//   target-window:  =name:    (exact match + active window, for select-layout)
//   target-pane:    =name:    (exact match + active pane, for split-window, select-pane)
//   pane ID:        %N        (always exact, for select-pane after split)
function sessionTarget(session: string): string {
  return `=${session}`;
}

function paneTarget(session: string): string {
  return `=${session}:`;
}

export function isTmuxAvailable(deps: TmuxDeps = defaultDeps): boolean {
  const result = deps.spawnSync(["which", "tmux"], { stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0;
}

export function teamSessionExists(teamName: string, deps: TmuxDeps = defaultDeps): boolean {
  const session = teamSessionName(teamName);
  const result = deps.spawnSync(["tmux", "has-session", "-t", sessionTarget(session)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return result.exitCode === 0;
}

export type TmuxLayout = "tiled" | "main-vertical";

export interface AddPaneOptions {
  teamName: string;
  agentName: string;
  command: string[];
  cwd: string;
  /** Tmux layout to apply after adding the pane. Defaults to "tiled". */
  layout?: TmuxLayout;
  /** Agent name to place in the main (left) position when layout is "main-vertical".
   *  Defaults to the first pane in the session (the team-lead). */
  mainPane?: string;
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
    if (stderr.includes("duplicate session")) {
      debug("tmux", "race condition on new-session, falling back to split-window", { session });
      return splitIntoSession(session, options, deps);
    }
    throw new Error(`Failed to create tmux session "${session}": ${stderr}`);
  }

  setPaneTitle(paneTarget(session), options.agentName, deps);
  const pid = getSessionPid(session, deps);

  debug("tmux", "created session", { session, agent: options.agentName, pid });
  return { pid, sessionName: session, isNewSession: true };
}

function splitIntoSession(session: string, options: AddPaneOptions, deps: TmuxDeps): AddPaneResult {
  const splitResult = deps.spawnSync(
    [
      "tmux",
      "split-window",
      "-t",
      paneTarget(session),
      "-c",
      options.cwd,
      "-P",
      "-F",
      "#{pane_id}",
      "--",
      ...options.command,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  if (splitResult.exitCode !== 0) {
    const stderr = splitResult.stderr.toString().trim();
    throw new Error(`Failed to split pane in tmux session "${session}": ${stderr}`);
  }

  const paneId = splitResult.stdout.toString().trim();

  setPaneTitle(paneId, options.agentName, deps);

  const layout = options.layout ?? "tiled";

  if (layout === "main-vertical") {
    // Select the designated main pane before applying main-vertical so tmux
    // puts it on the left. Falls back to the first pane (team-lead) if no
    // mainPane name is given or the name isn't found.
    const mainPaneId =
      (options.mainPane ? getPaneIdByTitle(session, options.mainPane, deps) : undefined) ??
      getFirstPaneId(session, deps);
    if (mainPaneId) {
      deps.spawnSync(["tmux", "select-pane", "-t", mainPaneId], { stdout: "pipe", stderr: "pipe" });
    }
  }

  deps.spawnSync(["tmux", "select-layout", "-t", paneTarget(session), layout], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const pid = getPanePid(session, paneId, deps);

  debug("tmux", "added pane", { session, pane: paneId, agent: options.agentName, pid });
  return { pid, sessionName: session, isNewSession: false };
}

function setPaneTitle(target: string, title: string, deps: TmuxDeps): void {
  deps.spawnSync(["tmux", "select-pane", "-t", target, "-T", title], { stdout: "pipe", stderr: "pipe" });
}

function getSessionPid(session: string, deps: TmuxDeps): number {
  const result = deps.spawnSync(["tmux", "list-panes", "-s", "-t", sessionTarget(session), "-F", "#{pane_pid}"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const pid = Number.parseInt(result.stdout.toString().trim().split("\n")[0], 10);
  if (Number.isNaN(pid)) {
    throw new Error(`Failed to get PID from tmux session "${session}"`);
  }
  return pid;
}

function getFirstPaneId(session: string, deps: TmuxDeps): string | undefined {
  const result = deps.spawnSync(
    ["tmux", "list-panes", "-s", "-t", sessionTarget(session), "-F", "#{pane_id}"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const first = result.stdout.toString().trim().split("\n")[0];
  return first || undefined;
}

function getPaneIdByTitle(session: string, title: string, deps: TmuxDeps): string | undefined {
  const result = deps.spawnSync(
    ["tmux", "list-panes", "-s", "-t", sessionTarget(session), "-F", "#{pane_id} #{pane_title}"],
    { stdout: "pipe", stderr: "pipe" },
  );
  for (const line of result.stdout.toString().trim().split("\n")) {
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) continue;
    if (line.slice(spaceIdx + 1) === title) return line.slice(0, spaceIdx);
  }
  return undefined;
}

function getPanePid(session: string, paneId: string, deps: TmuxDeps): number {
  const result = deps.spawnSync(
    ["tmux", "list-panes", "-s", "-t", sessionTarget(session), "-F", "#{pane_id} #{pane_pid}"],
    { stdout: "pipe", stderr: "pipe" },
  );
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
  const proc = Bun.spawn(["tmux", "attach", "-t", sessionTarget(session)], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return proc.exited;
}
