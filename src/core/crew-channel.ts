import { CREW_SENDER } from "../types/constants.ts";
import type { AppContext } from "../types/context.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err } from "../types/result.ts";

export interface CrewChannelFilter {
  unreadOnly?: boolean;
}

export interface CrewChannelResult {
  team: string;
  messages: InboxMessage[];
  totalCount: number;
  unreadCount: number;
}

export async function getCrewMessages(
  ctx: AppContext,
  team: string,
  filter?: CrewChannelFilter,
): Promise<Result<CrewChannelResult>> {
  const exists = await ctx.configStore.teamExists(team);
  if (!exists) {
    return err({ kind: "team_not_found", team });
  }

  const msgsResult = await ctx.inboxStore.readMessages(team, CREW_SENDER);
  if (!msgsResult.ok) return msgsResult;

  const allMessages = msgsResult.value;
  const totalCount = allMessages.length;
  const unreadCount = allMessages.filter((m) => !m.read).length;

  const sorted = [...allMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const messages = filter?.unreadOnly ? sorted.filter((m) => !m.read) : sorted;

  return { ok: true as const, value: { team, messages, totalCount, unreadCount } };
}

export async function markCrewMessagesRead(ctx: AppContext, team: string): Promise<Result<void>> {
  const exists = await ctx.configStore.teamExists(team);
  if (!exists) {
    return err({ kind: "team_not_found", team });
  }

  return ctx.inboxStore.markAllRead(team, CREW_SENDER);
}
