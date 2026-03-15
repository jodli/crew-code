import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { planDestroy, executeDestroy, type DestroyPlan } from "../core/destroy.ts";

export async function destroyTeam(
  ctx: AppContext,
  input: { team: string },
): Promise<Result<DestroyPlan>> {
  const plan = await planDestroy(ctx, input);
  if (!plan.ok) return plan;

  const result = await executeDestroy(ctx, plan.value);
  if (!result.ok) return result;

  return plan;
}
