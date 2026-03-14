import type { Launcher, LaunchOptions } from "../ports/launcher.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { tmuxExec, type TmuxResult } from "../lib/tmux.ts";
import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "../lib/claude-args.ts";

export interface TmuxLauncherDeps {
  execTmux: (args: string[], timeoutMs?: number) => Promise<TmuxResult>;
  whichSync: (cmd: string) => string | null;
}

const defaultDeps: TmuxLauncherDeps = {
  execTmux: tmuxExec,
  whichSync: (cmd: string) => {
    try {
      const result = Bun.spawnSync(["which", cmd], { stdout: "pipe" });
      return result.exitCode === 0 ? result.stdout.toString().trim() : null;
    } catch {
      return null;
    }
  },
};

export class TmuxLauncher implements Launcher {
  private deps: TmuxLauncherDeps;

  constructor(deps: Partial<TmuxLauncherDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async preflight(): Promise<Result<void>> {
    // Check tmux installed
    if (!this.deps.whichSync("tmux")) {
      return err({ kind: "tmux_not_installed" as const });
    }

    // Check tmux server running
    const serverResult = await this.deps.execTmux(["list-sessions"]);
    if (serverResult.exitCode !== 0) {
      return err({ kind: "tmux_server_not_running" as const });
    }

    // Check claude installed
    if (!this.deps.whichSync("claude")) {
      return err({ kind: "claude_not_installed" as const });
    }

    return ok(undefined);
  }

  async launch(opts: LaunchOptions): Promise<Result<string>> {
    const claudeArgs = buildClaudeArgs(opts);
    const cmd = `${CLAUDE_TEAMS_ENV_VAR}=1 claude ${claudeArgs.join(" ")}`;

    const result = await this.deps.execTmux([
      "split-window",
      "-h",
      "-d",
      "-c",
      opts.cwd,
      "-P",
      "-F",
      "#{pane_id}",
      cmd,
    ]);

    if (result.exitCode !== 0) {
      return err({
        kind: "launch_failed" as const,
        detail: result.stderr || "tmux split-window failed",
      });
    }

    const paneId = result.stdout.trim();
    if (!paneId) {
      return err({
        kind: "launch_failed" as const,
        detail: "tmux returned empty pane ID",
      });
    }

    return ok(paneId);
  }

  async kill(paneId: string): Promise<Result<void>> {
    const result = await this.deps.execTmux(["kill-pane", "-t", paneId]);
    // Treat any exit code as success — if the pane is already gone, that's fine
    if (result.exitCode !== 0) {
      return ok(undefined);
    }
    return ok(undefined);
  }

  async isAlive(paneId: string): Promise<boolean> {
    const result = await this.deps.execTmux([
      "list-panes",
      "-a",
      "-F",
      "#{pane_id}",
    ]);
    if (result.exitCode !== 0) return false;
    return result.stdout.split("\n").includes(paneId);
  }
}
