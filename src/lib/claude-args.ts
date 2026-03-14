import type { LaunchOptions } from "../ports/launcher.ts";

export const CLAUDE_TEAMS_ENV_VAR = "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS";

export function buildClaudeArgs(opts: LaunchOptions): string[] {
  const args = [
    "--agent-id", opts.agentId,
    "--agent-name", opts.agentName,
    "--team-name", opts.teamName,
  ];

  if (opts.color) args.push("--agent-color", opts.color);
  if (opts.parentSessionId) args.push("--parent-session-id", opts.parentSessionId);
  if (opts.model) args.push("--model", opts.model);

  return args;
}
