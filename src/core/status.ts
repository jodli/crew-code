import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";

export interface TeamSummary {
  name: string;
  description?: string;
  memberCount: number;
}

export interface MemberDetail {
  name: string;
  agentId: string;
  processId: string;
  sessionId?: string;
  cwd: string;
  unreadCount: number;
}

export interface TeamDetail {
  name: string;
  description?: string;
  members: MemberDetail[];
}

export async function listTeams(
  ctx: AppContext,
): Promise<Result<TeamSummary[]>> {
  const namesResult = await ctx.configStore.listTeams();
  if (!namesResult.ok) return namesResult;

  const summaries: TeamSummary[] = [];
  for (const name of namesResult.value) {
    const teamResult = await ctx.configStore.getTeam(name);
    if (!teamResult.ok) continue; // skip unreadable teams

    const config = teamResult.value;
    summaries.push({
      name: config.name,
      description: config.description,
      memberCount: config.members.length,
    });
  }

  return ok(summaries);
}

export async function getTeamDetail(
  ctx: AppContext,
  team: string,
): Promise<Result<TeamDetail>> {
  const teamResult = await ctx.configStore.getTeam(team);
  if (!teamResult.ok) return teamResult;

  const config = teamResult.value;
  const members: MemberDetail[] = [];

  for (const member of config.members) {
    const msgsResult = await ctx.inboxStore.readMessages(team, member.name);
    const unreadCount = msgsResult.ok
      ? msgsResult.value.filter((m) => !m.read).length
      : 0;

    members.push({
      name: member.name,
      agentId: member.agentId,
      processId: member.processId,
      sessionId: member.sessionId,
      cwd: member.cwd,
      unreadCount,
    });
  }

  return ok({
    name: config.name,
    description: config.description,
    members,
  });
}
