import {
  type CreateAgentInput,
  type CreateAgentOutput,
  executeCreateAgent,
  planCreateAgent,
} from "../core/create-agent.ts";
import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";

export { planCreateAgent } from "../core/create-agent.ts";

export async function createAgent(ctx: AppContext, input: CreateAgentInput): Promise<Result<CreateAgentOutput>> {
  const plan = await planCreateAgent(ctx, input);
  if (!plan.ok) return plan;

  return executeCreateAgent(ctx, plan.value);
}
