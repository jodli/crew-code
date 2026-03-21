import { randomUUID } from "node:crypto";
import { validateName } from "../lib/validate-name.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

export interface CreateInput {
  name: string;
  description?: string;
}

export interface CreatePlan {
  name: string;
  description?: string;
  leadSessionId: string;
}

export interface CreateOutput {
  name: string;
  leadSessionId: string;
}

export async function planCreate(ctx: AppContext, input: CreateInput): Promise<Result<CreatePlan>> {
  const nameCheck = validateName(input.name, "team");
  if (!nameCheck.ok) return nameCheck as Result<never>;

  const exists = await ctx.configStore.teamExists(input.name);
  if (exists) {
    return err({ kind: "team_already_exists", team: input.name });
  }

  return ok({
    name: input.name,
    description: input.description,
    leadSessionId: randomUUID(),
  });
}

export async function executeCreate(ctx: AppContext, plan: CreatePlan): Promise<Result<CreateOutput>> {
  const config: TeamConfig = {
    name: plan.name,
    description: plan.description,
    createdAt: Date.now(),
    leadAgentId: "",
    leadSessionId: plan.leadSessionId,
    members: [],
  };

  const result = await ctx.configStore.createTeam(config);
  if (!result.ok) return result as Result<never>;

  return ok({ name: plan.name, leadSessionId: plan.leadSessionId });
}
