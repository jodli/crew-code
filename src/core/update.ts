import type { AppContext } from "../types/context.ts";
import type { AgentMember, TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err } from "../types/result.ts";

export interface UpdateTeamInput {
  team: string;
  description?: string;
}

export async function updateTeam(ctx: AppContext, input: UpdateTeamInput): Promise<Result<TeamConfig>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) return teamResult;

  const hasUpdates = input.description !== undefined;
  if (!hasUpdates) return teamResult;

  return ctx.configStore.updateTeam(input.team, (config) => ({
    ...config,
    ...(input.description !== undefined && { description: input.description }),
  }));
}

export interface UpdateAgentInput {
  team: string;
  name: string;
  model?: string;
  color?: string;
  prompt?: string;
  extraArgs?: string[];
}

export async function updateAgent(ctx: AppContext, input: UpdateAgentInput): Promise<Result<AgentMember>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) return teamResult;

  const existing = teamResult.value.members.find((m) => m.name === input.name);
  if (!existing) {
    return err({ kind: "agent_not_found", agent: input.name, team: input.team });
  }

  const updateResult = await ctx.configStore.updateTeam(input.team, (config) => ({
    ...config,
    members: config.members.map((m) => {
      if (m.name !== input.name) return m;
      return {
        ...m,
        ...(input.model !== undefined && { model: input.model }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.prompt !== undefined && { prompt: input.prompt }),
        ...(input.extraArgs !== undefined && { extraArgs: input.extraArgs }),
      };
    }),
  }));

  if (!updateResult.ok) return updateResult;

  return {
    ok: true,
    value: updateResult.value.members.find((m) => m.name === input.name)!,
  };
}
