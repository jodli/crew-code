import type { LaunchOptions } from "../types/domain.ts";

export const CLAUDE_TEAMS_ENV_VAR = "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS";

export type LaunchMode = "new" | "resume";

export function buildClaudeArgs(opts: LaunchOptions, mode: LaunchMode = "new"): string[] {
  const args = [
    "--agent-id", opts.agentId,
    "--agent-name", opts.agentName,
    "--team-name", opts.teamName,
  ];

  if (opts.color) args.push("--agent-color", opts.color);
  if (opts.parentSessionId) args.push("--parent-session-id", opts.parentSessionId);
  if (opts.model) args.push("--model", opts.model);

  if (opts.sessionId) {
    if (mode === "resume") {
      args.push("--resume", opts.sessionId);
    } else {
      args.push("--session-id", opts.sessionId);
    }
  }

  return args;
}
