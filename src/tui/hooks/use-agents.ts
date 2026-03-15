import { useState, useEffect, useCallback } from "react";
import type { ConfigStore } from "../../ports/config-store.ts";
import type { InboxStore } from "../../ports/inbox-store.ts";
import type { AgentMember } from "../../types/domain.ts";
import { isProcessAlive } from "../../lib/process.ts";

export interface AgentSummary {
  name: string;
  agentId: string;
  status: "alive" | "dead";
  processId: string;
  sessionId?: string;
  model?: string;
  cwd: string;
  unreadCount: number;
  extraArgs?: string[];
}

function summarizeAgent(member: AgentMember, unreadCount: number): AgentSummary {
  const pid = parseInt(member.processId, 10);
  const alive = pid > 0 && isProcessAlive(pid);

  return {
    name: member.name,
    agentId: member.agentId,
    status: alive ? "alive" : "dead",
    processId: member.processId,
    sessionId: member.sessionId,
    model: member.model,
    cwd: member.cwd,
    unreadCount,
    extraArgs: member.extraArgs,
  };
}

export function useAgents(
  configStore: ConfigStore,
  inboxStore: InboxStore,
  teamName: string | null,
  pollIntervalMs = 2000,
) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!teamName) {
      setAgents([]);
      return;
    }

    const result = await configStore.getTeam(teamName);
    if (!result.ok) {
      setAgents([]);
      return;
    }

    const summaries = await Promise.all(
      result.value.members.map(async (member) => {
        let unread = 0;
        const inboxResult = await inboxStore.readMessages(teamName, member.name);
        if (inboxResult.ok) {
          unread = inboxResult.value.filter((m) => !m.read).length;
        }
        return summarizeAgent(member, unread);
      }),
    );

    setAgents(summaries);
  }, [configStore, inboxStore, teamName]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return agents;
}
