import type { AppContext } from "../types/context.ts";
import type { AgentMember } from "../types/domain.ts";
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
  agentType: string;
  processId?: number;
  sessionId?: string;
  model?: string;
  prompt?: string;
  color?: string;
  cwd: string;
  unreadCount: number;
  extraArgs?: string[];
}

export interface TeamDetail {
  name: string;
  description?: string;
  members: MemberDetail[];
}

async function enrichMembers(ctx: AppContext, team: string, members: AgentMember[]): Promise<MemberDetail[]> {
  const activeResult = ctx.processRegistry ? await ctx.processRegistry.listActive(team) : undefined;
  const pidByAgentId = new Map<string, number>();
  if (activeResult?.ok) {
    for (const entry of activeResult.value) {
      pidByAgentId.set(entry.agentId, entry.pid);
    }
  }

  const enriched: MemberDetail[] = [];
  for (const member of members) {
    const msgsResult = await ctx.inboxStore.readMessages(team, member.name);
    const unreadCount = msgsResult.ok ? msgsResult.value.filter((m) => !m.read).length : 0;

    enriched.push({
      name: member.name,
      agentId: member.agentId,
      agentType: member.agentType,
      processId: pidByAgentId.get(member.agentId),
      sessionId: member.sessionId,
      model: member.model,
      prompt: member.prompt,
      color: member.color,
      cwd: member.cwd,
      unreadCount,
      extraArgs: member.extraArgs,
    });
  }
  return enriched;
}

export async function listTeams(ctx: AppContext): Promise<Result<TeamSummary[]>> {
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

export async function getTeamDetail(ctx: AppContext, team: string): Promise<Result<TeamDetail>> {
  const teamResult = await ctx.configStore.getTeam(team);
  if (!teamResult.ok) return teamResult;

  const config = teamResult.value;
  const members = await enrichMembers(ctx, team, config.members);

  return ok({
    name: config.name,
    description: config.description,
    members,
  });
}

export async function listAgents(ctx: AppContext, team: string): Promise<Result<MemberDetail[]>> {
  const teamResult = await ctx.configStore.getTeam(team);
  if (!teamResult.ok) return teamResult;

  const members = await enrichMembers(ctx, team, teamResult.value.members);
  return ok(members);
}
