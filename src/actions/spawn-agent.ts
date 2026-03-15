import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { planSpawn, executeSpawn, type SpawnInput, type SpawnOutput } from "../core/spawn.ts";

export { planSpawn } from "../core/spawn.ts";

export async function spawnAgent(
  ctx: AppContext,
  input: SpawnInput,
): Promise<Result<SpawnOutput>> {
  const plan = await planSpawn(ctx, input);
  if (!plan.ok) return plan;

  return executeSpawn(ctx, plan.value);
}
