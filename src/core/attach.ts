import type { AppContext } from "../types/context.ts";
import type { LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { sessionExistsOnDisk } from "../lib/claude-session.ts";

export interface AttachInput {
  team: string;
  name?: string;
  checkSession?: (cwd: string, sessionId: string) => boolean;
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

  const checkSession = input.checkSession ?? sessionExistsOnDisk;
  if (!checkSession(member.cwd, member.sessionId)) {
    return err({
      kind: "stale_session",
      agent: agentName,
      team: input.team,
    });
  }

  const launchOptions: LaunchOptions = {
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
