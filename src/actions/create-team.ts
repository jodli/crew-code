import { type CreateInput, type CreateOutput, executeCreate, planCreate } from "../core/create.ts";
import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";

export { planCreate } from "../core/create.ts";

export async function createTeam(ctx: AppContext, input: CreateInput): Promise<Result<CreateOutput>> {
  const plan = await planCreate(ctx, input);
  if (!plan.ok) return plan;

  return executeCreate(ctx, plan.value);
}
