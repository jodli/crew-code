import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { CREW_SENDER } from "../types/constants.ts";

export interface SendInput {
  team: string;
  agent: string;
  message: string;
  from?: string;
}

export async function sendMessage(
  ctx: AppContext,
  input: SendInput,
): Promise<Result<void>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team: input.team });
    }
    return teamResult;
  }

  const config = teamResult.value;
  const member = config.members.find((m) => m.name === input.agent);
  if (!member) {
    return err({ kind: "agent_not_found", agent: input.agent, team: input.team });
  }

  const result = await ctx.inboxStore.appendMessage(input.team, input.agent, {
    from: input.from ?? CREW_SENDER,
    text: input.message,
    timestamp: new Date().toISOString(),
    read: false,
  });

  if (!result.ok) return result;
  return ok(undefined);
}
