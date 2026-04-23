import type { AppContext } from "../types/context.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

export interface StartTeamInput {
  team: string;
}

export interface StartTeamAgent {
  agentId: string;
  name: string;
  isLead: boolean;
  launchOptions: AgentLaunchInfo;
}

export interface StartTeamOutput {
  team: string;
  agents: StartTeamAgent[];
  skipped: Array<{ name: string; reason: string }>;
}

export async function startTeam(ctx: AppContext, input: StartTeamInput): Promise<Result<StartTeamOutput>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;
  const agents: StartTeamAgent[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  // Sort: team-lead first (creates the tmux session)
  const sorted = [...config.members].sort((a, b) => {
    if (a.agentType === "team-lead") return -1;
    if (b.agentType === "team-lead") return 1;
    return 0;
  });

  for (const member of sorted) {
    if (!member.sessionId) {
      skipped.push({ name: member.name, reason: "no session (agent was never started interactively)" });
      continue;
    }

    agents.push({
      agentId: member.agentId,
      name: member.name,
      isLead: member.agentType === "team-lead",
      launchOptions: {
        agentId: member.agentId,
        agentName: member.name,
        teamName: config.name,
        cwd: member.cwd,
        model: member.model,
        color: member.color,
        parentSessionId: member.agentType === "team-lead" ? undefined : config.leadSessionId,
        sessionId: member.sessionId,
        extraArgs: member.extraArgs,
      },
    });
  }

  return ok({ team: input.team, agents, skipped });
}
