import { buildClaudeArgs, CLAUDE_TEAMS_ENV_VAR } from "./claude-args.ts";
import type { LaunchOptions } from "../ports/launcher.ts";

export async function execClaude(opts: LaunchOptions): Promise<never> {
  const args = buildClaudeArgs(opts);
  const proc = Bun.spawn(["claude", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, [CLAUDE_TEAMS_ENV_VAR]: "1" },
  });
  const code = await proc.exited;
  process.exit(code);
}
