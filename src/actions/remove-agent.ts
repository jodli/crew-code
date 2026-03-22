import { executeRemoveAgent, planRemoveAgent } from "../core/remove.ts";
import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";

export async function removeAgent(ctx: AppContext, input: { team: string; name: string }): Promise<Result<void>> {
  const plan = await planRemoveAgent(ctx, input, ctx.processRegistry);
  if (!plan.ok) return plan;

  return executeRemoveAgent(ctx, plan.value, ctx.processRegistry);
}
