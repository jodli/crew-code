import type { AppContext } from "../types/context.ts";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
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
  registry?: ProcessRegistry,
): Promise<Result<DestroyPlan>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult;
  }

  const config = teamResult.value;

  // Check which agents are still alive
  const activeAgents: { name: string; processId: string }[] = [];

  if (registry) {
    const activeResult = await registry.listActive(input.team);
    if (activeResult.ok) {
      for (const entry of activeResult.value) {
        const member = config.members.find((m) => m.agentId === entry.agentId);
        if (member) {
          activeAgents.push({ name: member.name, processId: String(entry.pid) });
        }
      }
    }
  } else {
    // Fallback: check PIDs from config
    for (const member of config.members) {
      const pid = parseInt(member.processId, 10);
      if (member.processId && isProcessAlive(pid)) {
        activeAgents.push({ name: member.name, processId: member.processId });
      }
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
  registry?: ProcessRegistry,
): Promise<Result<void>> {
  // 1. Kill active agents
  if (registry) {
    for (const agent of plan.activeAgents) {
      // Find agentId from name — best effort, registry.kill needs agentId
      // For now, kill by PID directly as fallback since plan stores processId
      killProcess(parseInt(agent.processId, 10));
    }
  } else {
    for (const agent of plan.activeAgents) {
      killProcess(parseInt(agent.processId, 10));
    }
  }

  // 2. Delete inbox files
  for (const inbox of plan.inboxes) {
    const result = await ctx.inboxStore.deleteInbox(plan.team, inbox);
    if (!result.ok) return result;
  }

  // 3. Delete team config/directory
  const deleteResult = await ctx.configStore.deleteTeam(plan.team);
  if (!deleteResult.ok) return deleteResult;

  // 4. Cleanup process registry
  if (registry) {
    await registry.cleanup(plan.team);
  }

  return ok(undefined);
}
