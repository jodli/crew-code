import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import type { LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { planCreate, executeCreate, type CreatePlan } from "./create.ts";
import { executeSpawn, type SpawnPlan } from "./spawn.ts";

export interface LoadInput {
  nameOrPath: string;
  cwd?: string;
  dryRun?: boolean;
}

export interface LoadPlan {
  blueprint: Blueprint;
  teamName: string;
  createPlan: CreatePlan;
  spawnPlans: SpawnPlan[];
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

  const createPlan = createResult.value;
  const cwd = input.cwd ?? process.cwd();

  // Pre-validate all spawn plans
  const spawnPlans: SpawnPlan[] = [];
  const seenNames = new Set<string>();
  let hasLead = false;

  for (const agent of blueprint.agents) {
    if (seenNames.has(agent.name)) {
      return err({ kind: "agent_already_exists", agent: agent.name, team: blueprint.name });
    }
    seenNames.add(agent.name);

    if (agent.isLead) {
      if (hasLead) return err({ kind: "lead_already_exists", team: blueprint.name });
      hasLead = true;
    }

    spawnPlans.push({
      team: blueprint.name,
      agentName: agent.name,
      agentId: `${agent.name}@${blueprint.name}`,
      isLead: agent.isLead,
      cwd,
      sessionId: agent.isLead ? createPlan.leadSessionId : randomUUID(),
      parentSessionId: agent.isLead ? undefined : createPlan.leadSessionId,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      color: agent.color,
      extraArgs: agent.extraArgs,
    });
  }

  return ok({ blueprint, teamName: blueprint.name, createPlan, spawnPlans });
}

export async function executeLoad(
  ctx: AppContext,
  plan: LoadPlan,
): Promise<Result<LoadOutput>> {
  const createResult = await executeCreate(ctx, plan.createPlan);
  if (!createResult.ok) return createResult as Result<never>;

  const launchOptions: LaunchOptions[] = [];

  for (const spawnPlan of plan.spawnPlans) {
    const spawnResult = await executeSpawn(ctx, spawnPlan);
    if (!spawnResult.ok) return spawnResult as Result<never>;
    launchOptions.push(spawnResult.value.launchOptions);
  }

  return ok({ teamName: plan.teamName, launchOptions });
}
