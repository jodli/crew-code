import type { AppContext } from "../types/context.ts";
import type { LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface AttachInput {
  team: string;
  name?: string;
}

export interface AttachOutput {
  agentId: string;
  name: string;
  team: string;
  launchOptions: LaunchOptions;
}

export async function attachAgent(
  ctx: AppContext,
  input: AttachInput,
): Promise<Result<AttachOutput>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;
  const agentName = input.name ?? "team-lead";

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

  const isTeamLead = member.agentType === "team-lead";

  const launchOptions: LaunchOptions = {
    agentId: member.agentId,
    agentName: member.name,
    teamName: config.name,
    cwd: member.cwd,
    model: member.model,
    color: member.color,
    parentSessionId: isTeamLead ? undefined : config.leadSessionId,
    sessionId: member.sessionId,
  };

  return ok({
    agentId: member.agentId,
    name: member.name,
    team: input.team,
    launchOptions,
  });
}
