import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";

export interface UpdateTeamInput {
  team: string;
  description?: string;
}

export async function updateTeam(
  ctx: AppContext,
  input: UpdateTeamInput,
): Promise<Result<TeamConfig>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) return teamResult;

  const hasUpdates = input.description !== undefined;
  if (!hasUpdates) return teamResult;

  return ctx.configStore.updateTeam(input.team, (config) => ({
    ...config,
    ...(input.description !== undefined && { description: input.description }),
  }));
}
