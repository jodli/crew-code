import type { AgentLaunchInfo } from "../types/domain.ts";

export const CLAUDE_TEAMS_ENV_VAR = "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS";

export type LaunchMode = "new" | "resume";

export function buildClaudeArgs(info: AgentLaunchInfo, mode: LaunchMode = "new"): string[] {
  const args = ["--agent-id", info.agentId, "--agent-name", info.agentName, "--team-name", info.teamName];

  if (info.color) args.push("--agent-color", info.color);
  if (info.parentSessionId) args.push("--parent-session-id", info.parentSessionId);
  if (info.model) args.push("--model", info.model);
  if (info.agentType) args.push("--agent-type", info.agentType);

  if (info.sessionId) {
    if (mode === "resume") {
      args.push("--resume", info.sessionId);
    } else {
      args.push("--session-id", info.sessionId);
    }
  }

  if (info.extraArgs?.length) args.push(...info.extraArgs);

  return args;
}
