import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { planCreate, executeCreate, type CreatePlan } from "./create.ts";
import { executeSpawn, type SpawnPlan } from "./spawn.ts";

export interface LoadInput {
  nameOrPath: string;
  teamName?: string;
  cwd?: string;
  dryRun?: boolean;
}

export interface LoadPlan {
  blueprint: Blueprint;
  teamName: string;
  createPlan: CreatePlan;
  spawnPlans: SpawnPlan[];
  hasLead: boolean;
}

export interface LoadOutput {
  teamName: string;
  launchOptions: AgentLaunchInfo[];
  hasLead: boolean;
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
  const resolvedName = input.teamName ?? blueprint.name;

  const createResult = await planCreate(ctx, {
    name: resolvedName,
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
      return err({ kind: "agent_already_exists", agent: agent.name, team: resolvedName });
    }
    seenNames.add(agent.name);

    const agentType = agent.agentType ?? "general-purpose";
    const isLead = agentType === "team-lead";

    if (isLead) {
      if (hasLead) return err({ kind: "lead_already_exists", team: resolvedName });
      hasLead = true;
    }

    spawnPlans.push({
      team: resolvedName,
      agentName: agent.name,
      agentId: `${agent.name}@${resolvedName}`,
      agentType,
      cwd,
      sessionId: isLead ? createPlan.leadSessionId : randomUUID(),
      parentSessionId: isLead ? undefined : createPlan.leadSessionId,
      prompt: agent.prompt,
      model: agent.model,
      color: agent.color,
      extraArgs: agent.extraArgs,
    });
  }

  return ok({ blueprint, teamName: resolvedName, createPlan, spawnPlans, hasLead });
}

export async function executeLoad(
  ctx: AppContext,
  plan: LoadPlan,
): Promise<Result<LoadOutput>> {
  const createResult = await executeCreate(ctx, plan.createPlan);
  if (!createResult.ok) return createResult as Result<never>;

  const launchOptions: AgentLaunchInfo[] = [];

  for (const spawnPlan of plan.spawnPlans) {
    const spawnResult = await executeSpawn(ctx, spawnPlan);
    if (!spawnResult.ok) return spawnResult as Result<never>;
    launchOptions.push(spawnResult.value.launchOptions);
  }

  return ok({ teamName: plan.teamName, launchOptions, hasLead: plan.hasLead });
}
