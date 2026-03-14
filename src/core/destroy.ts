import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { isProcessAlive, killProcess } from "../lib/process.ts";

export interface DestroyInput {
  team: string;
}

export interface DestroyPlan {
  team: string;
  activeAgents: { name: string; processId: string }[];
  inboxes: string[];
}

export async function planDestroy(
  ctx: AppContext,
  input: DestroyInput,
): Promise<Result<DestroyPlan>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) return teamResult;

  const config = teamResult.value;

  // Check which agents are still alive via PID
  const activeAgents: { name: string; processId: string }[] = [];
  for (const member of config.members) {
    const pid = parseInt(member.processId, 10);
    if (member.processId && isProcessAlive(pid)) {
      activeAgents.push({ name: member.name, processId: member.processId });
    }
  }

  // List inboxes
  const inboxResult = await ctx.inboxStore.listInboxes(input.team);
  const inboxes = inboxResult.ok ? inboxResult.value : [];

  return ok({ team: input.team, activeAgents, inboxes });
}

export async function executeDestroy(
  ctx: AppContext,
  plan: DestroyPlan,
): Promise<Result<void>> {
  // 1. Kill active agents via PID (ignore failures — process may already be dead)
  for (const agent of plan.activeAgents) {
    killProcess(parseInt(agent.processId, 10));
  }

  // 2. Delete inbox files
  for (const inbox of plan.inboxes) {
    const result = await ctx.inboxStore.deleteInbox(plan.team, inbox);
    if (!result.ok) return result;
  }

  // 3. Delete team config/directory
  const deleteResult = await ctx.configStore.deleteTeam(plan.team);
  if (!deleteResult.ok) return deleteResult;

  return ok(undefined);
}
