import { useState, useEffect, useCallback } from "react";
import type { ConfigStore } from "../../ports/config-store.ts";
import type { AgentMember } from "../../types/domain.ts";
import { isProcessAlive } from "../../lib/process.ts";

export interface AgentSummary {
  name: string;
  agentId: string;
  status: "alive" | "dead";
  processId: string;
  sessionId?: string;
  cwd: string;
}

function summarizeAgent(member: AgentMember): AgentSummary {
  const pid = parseInt(member.processId, 10);
  const alive = pid > 0 && isProcessAlive(pid);

  return {
    name: member.name,
    agentId: member.agentId,
    status: alive ? "alive" : "dead",
    processId: member.processId,
    sessionId: member.sessionId,
    cwd: member.cwd,
  };
}

export function useAgents(
  configStore: ConfigStore,
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

    setAgents(result.value.members.map(summarizeAgent));
  }, [configStore, teamName]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return agents;
}
