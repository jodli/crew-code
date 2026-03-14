import type { AppContext } from "../types/context.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

export interface InboxFilter {
  unreadOnly?: boolean;
}

export interface InboxResult {
  team: string;
  agent: string;
  messages: InboxMessage[];
  totalCount: number;
  unreadCount: number;
}

export async function getInbox(
  ctx: AppContext,
  team: string,
  agent: string,
  filter?: InboxFilter,
): Promise<Result<InboxResult>> {
  const teamResult = await ctx.configStore.getTeam(team);
  if (!teamResult.ok) {
    if (teamResult.error.kind === "config_not_found") {
      return err({ kind: "team_not_found", team });
    }
    return teamResult;
  }

  const config = teamResult.value;
  const member = config.members.find((m) => m.name === agent);
  if (!member) {
    return err({ kind: "agent_not_found", agent, team });
  }

  const msgsResult = await ctx.inboxStore.readMessages(team, agent);
  if (!msgsResult.ok) return msgsResult;

  const allMessages = msgsResult.value;
  const totalCount = allMessages.length;
  const unreadCount = allMessages.filter((m) => !m.read).length;

  // Sort oldest first (chronological)
  const sorted = [...allMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const messages = filter?.unreadOnly
    ? sorted.filter((m) => !m.read)
    : sorted;

  return ok({ team, agent, messages, totalCount, unreadCount });
}
