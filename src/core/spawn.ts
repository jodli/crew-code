import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, InboxMessage, LaunchOptions } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface RegisterInput {
  team: string;
  task?: string;
  name?: string;
  model?: string;
  color?: string;
}

export interface RegisterOutput {
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

export async function registerAgent(
  ctx: AppContext,
  input: RegisterInput,
): Promise<Result<RegisterOutput>> {
  // 1. Get team config
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;

  // 2. Generate or validate agent name
  const agentName = input.name ?? nextAgentName(config.members);
  const agentId = `${agentName}@${input.team}`;

  // 3. Check for duplicates
  const existing = config.members.find((m) => m.name === agentName);
  if (existing) {
    return err({
      kind: "agent_already_exists",
      agent: agentName,
      team: input.team,
    });
  }

  // 4. Add member to config (isActive: false, processId: "")
  const cwd = process.cwd();
  const sessionId = randomUUID();
  const newMember: AgentMember = {
    agentId,
    name: agentName,
    model: input.model,
    color: input.color,
    joinedAt: Date.now(),
    processId: "",
    cwd,
    subscriptions: [],
    isActive: false,
    sessionId,
  };

  const addResult = await ctx.configStore.updateTeam(input.team, (cfg) => ({
    ...cfg,
    members: [...cfg.members, newMember],
  }));
  if (!addResult.ok) return addResult as Result<never>;

  // 5. Create inbox (seed with task if provided)
  const initialMessages: InboxMessage[] = input.task
    ? [
        {
          from: "team-lead",
          text: input.task,
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]
    : [];

  const inboxResult = await ctx.inboxStore.createInbox(
    input.team,
    agentName,
    initialMessages,
  );
  if (!inboxResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(input.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== agentId),
    }));
    return inboxResult as Result<never>;
  }

  // 6. Build LaunchOptions
  const launchOptions: LaunchOptions = {
    agentId,
    agentName,
    teamName: input.team,
    cwd,
    color: input.color,
    parentSessionId: config.leadSessionId,
    model: input.model,
    sessionId,
  };

  return ok({ agentId, name: agentName, team: input.team, launchOptions });
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

