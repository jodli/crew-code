import { executeRemoveTeam, planRemoveTeam, type RemoveTeamPlan } from "../core/remove-team.ts";
import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";

export async function removeTeam(ctx: AppContext, input: { team: string }): Promise<Result<RemoveTeamPlan>> {
  const plan = await planRemoveTeam(ctx, input, ctx.processRegistry);
  if (!plan.ok) return plan;

  const result = await executeRemoveTeam(ctx, plan.value, ctx.processRegistry);
  if (!result.ok) return result;

  return plan;
}
