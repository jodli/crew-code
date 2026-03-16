import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { isProcessAlive, killProcess } from "../lib/process.ts";

export interface RemoveInput {
  team: string;
  name: string;
}

export interface RemovePlan {
  team: string;
  name: string;
  agentId: string;
  processId: string;
  isAlive: boolean;
  hasInbox: boolean;
}

export async function planRemove(
  ctx: AppContext,
  input: RemoveInput,
): Promise<Result<RemovePlan>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult as Result<never>;
  }

  const config = teamResult.value;

  const member = config.members.find((m) => m.name === input.name);
  if (!member) {
    return err({ kind: "agent_not_found", agent: input.name, team: input.team });
  }

  const pid = parseInt(member.processId, 10);
  const isAlive = member.processId ? isProcessAlive(pid) : false;

  const inboxResult = await ctx.inboxStore.listInboxes(input.team);
  const inboxes = inboxResult.ok ? inboxResult.value : [];
  const hasInbox = inboxes.includes(input.name);

  return ok({
    team: input.team,
    name: input.name,
    agentId: member.agentId,
    processId: member.processId,
    isAlive,
    hasInbox,
  });
}

export async function executeRemove(
  ctx: AppContext,
  plan: RemovePlan,
): Promise<Result<void>> {
  if (plan.isAlive) {
    killProcess(parseInt(plan.processId, 10));
  }

  if (plan.hasInbox) {
    const deleteResult = await ctx.inboxStore.deleteInbox(plan.team, plan.name);
    if (!deleteResult.ok) return deleteResult;
  }

  const updateResult = await ctx.configStore.updateTeam(plan.team, (cfg) => ({
    ...cfg,
    members: cfg.members.filter((m) => m.agentId !== plan.agentId),
  }));
  if (!updateResult.ok) return updateResult as Result<never>;

  return ok(undefined);
}
