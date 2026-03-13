import type { AppContext } from "../types/context.ts";
import type { AgentMember, InboxMessage } from "../types/domain.ts";
import type { CrewError } from "../types/errors.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface SpawnInput {
  team: string;
  name?: string;
  task: string;
  model?: string;
  color?: string;
}

export interface SpawnOutput {
  agentId: string;
  name: string;
  team: string;
  paneId: string;
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

export async function spawn(
  ctx: AppContext,
  input: SpawnInput,
): Promise<Result<SpawnOutput>> {
  // 1. Preflight
  const preflightResult = await ctx.launcher.preflight();
  if (!preflightResult.ok) return preflightResult as Result<never>;

  // 2. Get team config
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;

  // 3. Generate or validate agent name
  const agentName = input.name ?? generateAgentName();
  const agentId = `${agentName}@${input.team}`;

  // 4. Check for duplicates
  const existing = config.members.find((m) => m.name === agentName);
  if (existing) {
    return err({
      kind: "agent_already_exists",
      agent: agentName,
      team: input.team,
    });
  }

  // 5. Add member to config
  const cwd = process.cwd();
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
  };

  const addResult = await ctx.configStore.updateTeam(input.team, (cfg) => ({
    ...cfg,
    members: [...cfg.members, newMember],
  }));
  if (!addResult.ok) return addResult as Result<never>;

  // 6. Seed inbox with task
  const initialMessage: InboxMessage = {
    from: "team-lead",
    text: input.task,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const inboxResult = await ctx.inboxStore.createInbox(
    input.team,
    agentName,
    [initialMessage],
  );
  if (!inboxResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(input.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== agentId),
    }));
    return inboxResult as Result<never>;
  }

  // 7. Launch
  const launchResult = await ctx.launcher.launch({
    agentId,
    agentName,
    teamName: input.team,
    cwd,
    color: input.color,
    parentSessionId: config.leadSessionId,
    model: input.model,
  });

  if (!launchResult.ok) {
    // Rollback: remove member from config
    await ctx.configStore.updateTeam(input.team, (cfg) => ({
      ...cfg,
      members: cfg.members.filter((m) => m.agentId !== agentId),
    }));
    return launchResult as Result<never>;
  }

  const paneId = launchResult.value;

  // 8. Update config with pane ID and active status
  await ctx.configStore.updateTeam(input.team, (cfg) => ({
    ...cfg,
    members: cfg.members.map((m) =>
      m.agentId === agentId ? { ...m, tmuxPaneId: paneId, isActive: true } : m,
    ),
  }));

  return ok({ agentId, name: agentName, team: input.team, paneId });
}
