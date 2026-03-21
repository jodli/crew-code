import type { AppContext } from "../types/context.ts";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { validateName } from "../lib/validate-name.ts";

export interface DestroyInput {
  team: string;
}

export interface DestroyPlan {
  team: string;
  activeAgents: { name: string; agentId: string; pid: number }[];
  inboxes: string[];
}

export async function planDestroy(
  ctx: AppContext,
  input: DestroyInput,
  registry?: ProcessRegistry,
): Promise<Result<DestroyPlan>> {
  const teamCheck = validateName(input.team, "team");
  if (!teamCheck.ok) return teamCheck as Result<never>;

  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult;
  }

  const config = teamResult.value;
  const activeAgents: { name: string; agentId: string; pid: number }[] = [];

  if (registry) {
    const activeResult = await registry.listActive(input.team);
    if (activeResult.ok) {
      for (const entry of activeResult.value) {
        const member = config.members.find((m) => m.agentId === entry.agentId);
        if (member) {
          activeAgents.push({ name: member.name, agentId: entry.agentId, pid: entry.pid });
        }
      }
    }
  }

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
      await registry.kill(plan.team, agent.agentId);
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
