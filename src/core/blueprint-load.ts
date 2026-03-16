import type { AppContext } from "../types/context.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import type { LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { planCreate, executeCreate, type CreatePlan } from "./create.ts";
import { planSpawn, executeSpawn } from "./spawn.ts";

export interface LoadInput {
  nameOrPath: string;
  cwd?: string;
  dryRun?: boolean;
}

export interface LoadPlan {
  blueprint: Blueprint;
  teamName: string;
  createPlan: CreatePlan;
}

export interface LoadOutput {
  teamName: string;
  launchOptions: LaunchOptions[];
}

export async function planLoad(
  ctx: AppContext,
  input: LoadInput,
): Promise<Result<LoadPlan>> {
  if (!ctx.blueprintStore) {
    return err({ kind: "launch_failed", detail: "BlueprintStore not configured" });
  }

  const bpResult = await ctx.blueprintStore.load(input.nameOrPath);
  if (!bpResult.ok) return bpResult as Result<never>;

  const blueprint = bpResult.value;
  const createResult = await planCreate(ctx, {
    name: blueprint.name,
    description: blueprint.description,
  });
  if (!createResult.ok) return createResult as Result<never>;

  return ok({
    blueprint,
    teamName: blueprint.name,
    createPlan: createResult.value,
  });
}

export async function executeLoad(
  ctx: AppContext,
  plan: LoadPlan,
): Promise<Result<LoadOutput>> {
  const createResult = await executeCreate(ctx, plan.createPlan);
  if (!createResult.ok) return createResult as Result<never>;

  const launchOptions: LaunchOptions[] = [createResult.value.launchOptions];

  for (const agent of plan.blueprint.agents) {
    const spawnPlan = await planSpawn(ctx, {
      team: plan.teamName,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      color: agent.color,
      extraArgs: agent.extraArgs,
    });
    if (!spawnPlan.ok) return spawnPlan as Result<never>;

    const spawnResult = await executeSpawn(ctx, spawnPlan.value);
    if (!spawnResult.ok) return spawnResult as Result<never>;

    launchOptions.push(spawnResult.value.launchOptions);
  }

  return ok({ teamName: plan.teamName, launchOptions });
}
