import type { AppContext } from "../types/context.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

export interface StartAgentInput {
  team: string;
  name?: string;
}

export interface StartAgentOutput {
  agentId: string;
  name: string;
  team: string;
  launchOptions: AgentLaunchInfo;
}

export async function startAgent(ctx: AppContext, input: StartAgentInput): Promise<Result<StartAgentOutput>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;
  const agentName = input.name ?? config.members.find((m) => m.agentType === "team-lead")?.name ?? "team-lead";

  const member = config.members.find((m) => m.name === agentName);
  if (!member) {
    return err({ kind: "agent_not_found", agent: agentName, team: input.team });
  }

  if (!member.sessionId) {
    return err({
      kind: "no_session_id",
      agent: agentName,
      team: input.team,
    });
  }

  const launchOptions: AgentLaunchInfo = {
    agentId: member.agentId,
    agentName: member.name,
    teamName: config.name,
    cwd: member.cwd,
    model: member.model,
    color: member.color,
    parentSessionId: member.agentType === "team-lead" ? undefined : config.leadSessionId,
    sessionId: member.sessionId,
    extraArgs: member.extraArgs,
  };

  return ok({
    agentId: member.agentId,
    name: member.name,
    team: input.team,
    launchOptions,
  });
}
