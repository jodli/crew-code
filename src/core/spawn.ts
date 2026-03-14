import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, InboxMessage } from "../types/domain.ts";
import type { LaunchOptions } from "../ports/launcher.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface SpawnInput {
  team: string;
  name?: string;
  task?: string;
  model?: string;
  color?: string;
}

export interface SpawnOutput {
  agentId: string;
  name: string;
  team: string;
  paneId: string;
}

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

let nameCounter = 0;

function generateAgentName(): string {
  nameCounter++;
  return `agent-${nameCounter}`;
}

// Exported for testing
export function resetNameCounter(): void {
  nameCounter = 0;
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
  const agentName = input.name ?? generateAgentName();
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

  // 4. Add member to config (isActive: false, tmuxPaneId: "")
  const cwd = process.cwd();
  const sessionId = randomUUID();
  const newMember: AgentMember = {
    agentId,
    name: agentName,
    model: input.model,
    color: input.color,
    joinedAt: Date.now(),
    tmuxPaneId: "",
    cwd,
    subscriptions: [],
    backendType: "tmux",
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
  paneId: string,
): Promise<Result<void>> {
  return ctx.configStore.updateTeam(team, (cfg) => ({
    ...cfg,
    members: cfg.members.map((m) =>
      m.agentId === agentId ? { ...m, tmuxPaneId: paneId, isActive: true } : m,
    ),
  })) as Promise<Result<void>>;
}

export async function spawn(
  ctx: AppContext,
  input: SpawnInput,
): Promise<Result<SpawnOutput>> {
  // 1. Preflight (tmux check — only needed for pane mode)
  const preflightResult = await ctx.launcher.preflight();
  if (!preflightResult.ok) return preflightResult as Result<never>;

  // 2. Register
  const regResult = await registerAgent(ctx, input);
  if (!regResult.ok) return regResult as Result<never>;

  // 3. Launch in tmux pane
  const launchResult = await ctx.launcher.launch(regResult.value.launchOptions);
  if (!launchResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(input.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== regResult.value.agentId),
    }));
    return launchResult as Result<never>;
  }

  // 4. Activate (set pane ID + isActive)
  await activateAgent(ctx, input.team, regResult.value.agentId, launchResult.value);

  return ok({
    agentId: regResult.value.agentId,
    name: regResult.value.name,
    team: regResult.value.team,
    paneId: launchResult.value,
  });
}
