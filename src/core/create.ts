import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, TeamConfig } from "../types/domain.ts";
import type { LaunchOptions } from "../ports/launcher.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface CreateInput {
  name: string;
  description?: string;
}

export interface CreateOutput {
  name: string;
  leadAgentId: string;
  launchOptions: LaunchOptions;
}

export async function createTeam(
  ctx: AppContext,
  input: CreateInput,
): Promise<Result<CreateOutput>> {
  const exists = await ctx.configStore.teamExists(input.name);
  if (exists) {
    return err({ kind: "team_already_exists", team: input.name });
  }

  const leadAgentId = `team-lead@${input.name}`;
  const leadSessionId = randomUUID();
  const now = Date.now();

  const leadMember: AgentMember = {
    agentId: leadAgentId,
    name: "team-lead",
    agentType: "team-lead",
    joinedAt: now,
    tmuxPaneId: "",
    cwd: process.cwd(),
    subscriptions: [],
    sessionId: leadSessionId,
  };

  const config: TeamConfig = {
    name: input.name,
    description: input.description,
    createdAt: now,
    leadAgentId,
    leadSessionId,
    members: [leadMember],
  };

  const result = await ctx.configStore.createTeam(config);
  if (!result.ok) return result as Result<never>;

  const launchOptions: LaunchOptions = {
    agentId: leadAgentId,
    agentName: "team-lead",
    teamName: input.name,
    cwd: process.cwd(),
    sessionId: leadSessionId,
  };

  return ok({ name: input.name, leadAgentId, launchOptions });
}
