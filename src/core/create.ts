import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, TeamConfig, LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface CreateInput {
  name: string;
  description?: string;
}

export interface CreatePlan {
  name: string;
  description?: string;
  leadAgentId: string;
  leadSessionId: string;
  cwd: string;
}

export interface CreateOutput {
  name: string;
  leadAgentId: string;
  launchOptions: LaunchOptions;
}

export async function planCreate(
  ctx: AppContext,
  input: CreateInput,
): Promise<Result<CreatePlan>> {
  const exists = await ctx.configStore.teamExists(input.name);
  if (exists) {
    return err({ kind: "team_already_exists", team: input.name });
  }

  return ok({
    name: input.name,
    description: input.description,
    leadAgentId: `team-lead@${input.name}`,
    leadSessionId: randomUUID(),
    cwd: process.cwd(),
  });
}

export async function executeCreate(
  ctx: AppContext,
  plan: CreatePlan,
): Promise<Result<CreateOutput>> {
  const now = Date.now();

  const leadMember: AgentMember = {
    agentId: plan.leadAgentId,
    name: "team-lead",
    agentType: "team-lead",
    joinedAt: now,
    processId: "",
    cwd: plan.cwd,
    subscriptions: [],
    sessionId: plan.leadSessionId,
  };

  const config: TeamConfig = {
    name: plan.name,
    description: plan.description,
    createdAt: now,
    leadAgentId: plan.leadAgentId,
    leadSessionId: plan.leadSessionId,
    members: [leadMember],
  };

  const result = await ctx.configStore.createTeam(config);
  if (!result.ok) return result as Result<never>;

  const launchOptions: LaunchOptions = {
    agentId: plan.leadAgentId,
    agentName: "team-lead",
    teamName: plan.name,
    cwd: plan.cwd,
    sessionId: plan.leadSessionId,
  };

  return ok({ name: plan.name, leadAgentId: plan.leadAgentId, launchOptions });
}
