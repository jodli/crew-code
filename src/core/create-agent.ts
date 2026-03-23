import { randomUUID } from "node:crypto";
import { validateName } from "../lib/validate-name.ts";
import type { AppContext } from "../types/context.ts";
import type { AgentLaunchInfo, AgentMember, InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

export interface CreateAgentInput {
  team: string;
  prompt?: string;
  name?: string;
  agentType?: string;
  cwd?: string;
  model?: string;
  color?: string;
  extraArgs?: string[];
}

export interface CreateAgentPlan {
  team: string;
  agentName: string;
  agentId: string;
  agentType: string;
  cwd: string;
  sessionId: string;
  model?: string;
  color?: string;
  parentSessionId?: string;
  prompt?: string;
  extraArgs?: string[];
}

export interface CreateAgentOutput {
  agentId: string;
  name: string;
  team: string;
  launchOptions: AgentLaunchInfo;
}

function nextAgentName(members: AgentMember[]): string {
  let max = 0;
  for (const m of members) {
    const match = m.name.match(/^agent-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `agent-${max + 1}`;
}

export async function planCreateAgent(ctx: AppContext, input: CreateAgentInput): Promise<Result<CreateAgentPlan>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;
  const agentName = input.name ?? nextAgentName(config.members);

  if (input.name) {
    const nameCheck = validateName(input.name, "agent");
    if (!nameCheck.ok) return nameCheck as Result<never>;
  }
  const agentId = `${agentName}@${input.team}`;
  const agentType = input.agentType ?? "general-purpose";
  const isLead = agentType === "team-lead";

  const existing = config.members.find((m) => m.name === agentName);
  if (existing) {
    return err({
      kind: "agent_already_exists",
      agent: agentName,
      team: input.team,
    });
  }

  if (isLead && config.members.some((m) => m.agentType === "team-lead")) {
    return err({ kind: "lead_already_exists", team: input.team });
  }

  return ok({
    team: input.team,
    agentName,
    agentId,
    agentType,
    cwd: input.cwd ?? process.cwd(),
    sessionId: isLead ? config.leadSessionId : randomUUID(),
    model: input.model,
    color: input.color,
    parentSessionId: isLead ? undefined : config.leadSessionId,
    prompt: input.prompt,
    extraArgs: input.extraArgs,
  });
}

export async function executeCreateAgent(ctx: AppContext, plan: CreateAgentPlan): Promise<Result<CreateAgentOutput>> {
  const isLead = plan.agentType === "team-lead";

  const newMember: AgentMember = {
    agentId: plan.agentId,
    name: plan.agentName,
    agentType: plan.agentType,
    model: plan.model,
    color: plan.color,
    joinedAt: Date.now(),
    cwd: plan.cwd,
    subscriptions: [],
    sessionId: plan.sessionId,
    prompt: plan.prompt,
    extraArgs: plan.extraArgs,
  };

  const addResult = await ctx.configStore.updateTeam(plan.team, (cfg) => ({
    ...cfg,
    leadAgentId: isLead ? plan.agentId : cfg.leadAgentId,
    members: [...cfg.members, newMember],
  }));
  if (!addResult.ok) return addResult as Result<never>;

  const initialMessages: InboxMessage[] = plan.prompt
    ? [
        {
          from: "team-lead",
          text: plan.prompt,
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]
    : [];

  const inboxResult = await ctx.inboxStore.createInbox(plan.team, plan.agentName, initialMessages);
  if (!inboxResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(plan.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== plan.agentId),
    }));
    return inboxResult as Result<never>;
  }

  const launchOptions: AgentLaunchInfo = {
    agentId: plan.agentId,
    agentName: plan.agentName,
    teamName: plan.team,
    cwd: plan.cwd,
    color: plan.color,
    parentSessionId: plan.parentSessionId,
    model: plan.model,
    sessionId: plan.sessionId,
    agentType: plan.agentType,
    extraArgs: plan.extraArgs,
  };

  return ok({ agentId: plan.agentId, name: plan.agentName, team: plan.team, launchOptions });
}
