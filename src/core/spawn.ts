import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, InboxMessage, LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface SpawnInput {
  team: string;
  systemPrompt?: string;
  name?: string;
  model?: string;
  color?: string;
  extraArgs?: string[];
}

export interface SpawnPlan {
  team: string;
  agentName: string;
  agentId: string;
  cwd: string;
  sessionId: string;
  model?: string;
  color?: string;
  parentSessionId: string;
  systemPrompt?: string;
  extraArgs?: string[];
}

export interface SpawnOutput {
  agentId: string;
  name: string;
  team: string;
  launchOptions: LaunchOptions;
}

function nextAgentName(members: AgentMember[]): string {
  let max = 0;
  for (const m of members) {
    const match = m.name.match(/^agent-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `agent-${max + 1}`;
}

export async function planSpawn(
  ctx: AppContext,
  input: SpawnInput,
): Promise<Result<SpawnPlan>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;
  const agentName = input.name ?? nextAgentName(config.members);
  const agentId = `${agentName}@${input.team}`;

  const existing = config.members.find((m) => m.name === agentName);
  if (existing) {
    return err({
      kind: "agent_already_exists",
      agent: agentName,
      team: input.team,
    });
  }

  return ok({
    team: input.team,
    agentName,
    agentId,
    cwd: process.cwd(),
    sessionId: randomUUID(),
    model: input.model,
    color: input.color,
    parentSessionId: config.leadSessionId,
    systemPrompt: input.systemPrompt,
    extraArgs: input.extraArgs,
  });
}

export async function executeSpawn(
  ctx: AppContext,
  plan: SpawnPlan,
): Promise<Result<SpawnOutput>> {
  const newMember: AgentMember = {
    agentId: plan.agentId,
    name: plan.agentName,
    model: plan.model,
    color: plan.color,
    joinedAt: Date.now(),
    processId: "",
    cwd: plan.cwd,
    subscriptions: [],
    isActive: false,
    sessionId: plan.sessionId,
    systemPrompt: plan.systemPrompt,
    extraArgs: plan.extraArgs,
  };

  const addResult = await ctx.configStore.updateTeam(plan.team, (cfg) => ({
    ...cfg,
    members: [...cfg.members, newMember],
  }));
  if (!addResult.ok) return addResult as Result<never>;

  const initialMessages: InboxMessage[] = plan.systemPrompt
    ? [
        {
          from: "team-lead",
          text: plan.systemPrompt,
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]
    : [];

  const inboxResult = await ctx.inboxStore.createInbox(
    plan.team,
    plan.agentName,
    initialMessages,
  );
  if (!inboxResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(plan.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== plan.agentId),
    }));
    return inboxResult as Result<never>;
  }

  const launchOptions: LaunchOptions = {
    agentId: plan.agentId,
    agentName: plan.agentName,
    teamName: plan.team,
    cwd: plan.cwd,
    color: plan.color,
    parentSessionId: plan.parentSessionId,
    model: plan.model,
    sessionId: plan.sessionId,
    extraArgs: plan.extraArgs,
  };

  return ok({ agentId: plan.agentId, name: plan.agentName, team: plan.team, launchOptions });
}

export async function activateAgent(
  ctx: AppContext,
  team: string,
  agentId: string,
  processId: string,
): Promise<Result<void>> {
  return ctx.configStore.updateTeam(team, (cfg) => ({
    ...cfg,
    members: cfg.members.map((m) =>
      m.agentId === agentId ? { ...m, processId, isActive: true } : m,
    ),
  })) as Promise<Result<void>>;
}
