import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { planCreate, executeCreate, type CreateInput, type CreateOutput } from "../core/create.ts";

export { planCreate } from "../core/create.ts";

export async function createTeam(
  ctx: AppContext,
  input: CreateInput,
): Promise<Result<CreateOutput>> {
  const plan = await planCreate(ctx, input);
  if (!plan.ok) return plan;

  return executeCreate(ctx, plan.value);
}
