import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import type { LaunchMode } from "./claude-args.ts";
import type { LaunchOptions } from "../ports/launcher.ts";

export interface ExecClaudeOptions {
  mode?: LaunchMode;
}

export async function execClaude(opts: LaunchOptions, execOpts?: ExecClaudeOptions): Promise<never> {
  const args = buildClaudeArgs(opts, execOpts?.mode);
  const proc = Bun.spawn(["claude", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    cwd: opts.cwd,
    env: { ...process.env, [CLAUDE_TEAMS_ENV_VAR]: "1" },
  });
  const code = await proc.exited;
  process.exit(code);
}
