import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import type { LaunchMode } from "./claude-args.ts";
import type { LaunchOptions } from "../types/domain.ts";

export interface ExecClaudeOptions {
  mode?: LaunchMode;
}

export interface ExecClaudeResult {
  pid: number;
  exited: Promise<number>;
}

export function launchClaude(opts: LaunchOptions, execOpts?: ExecClaudeOptions): ExecClaudeResult {
  const args = buildClaudeArgs(opts, execOpts?.mode);
  const proc = Bun.spawn(["claude", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    cwd: opts.cwd,
    env: { ...process.env, [CLAUDE_TEAMS_ENV_VAR]: "1" },
  });
  return { pid: proc.pid, exited: proc.exited };
}