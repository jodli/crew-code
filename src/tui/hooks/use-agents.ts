import { useState, useEffect, useCallback } from "react";
import type { AppContext } from "../../types/context.ts";
import type { MemberDetail } from "../../core/status.ts";
import { listAgents } from "../../actions/list-agents.ts";
import { isProcessAlive } from "../../lib/process.ts";

export interface AgentSummary {
  name: string;
  agentId: string;
  agentType: string;
  status: "alive" | "dead";
  processId: string;
  sessionId?: string;
  model?: string;
  prompt?: string;
  color?: string;
  cwd: string;
  unreadCount: number;
  extraArgs?: string[];
}

function toAgentSummary(member: MemberDetail): AgentSummary {
  const pid = parseInt(member.processId, 10);
  const alive = pid > 0 && isProcessAlive(pid);

  return {
    ...member,
    status: alive ? "alive" : "dead",
  };
}

export function useAgents(
  ctx: AppContext,
  teamName: string | null,
  pollIntervalMs = 2000,
) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!teamName) {
      setAgents([]);
      return;
    }

    const result = await listAgents(ctx, teamName);
    if (!result.ok) {
      setAgents([]);
      return;
    }

    setAgents(result.value.map(toAgentSummary));
  }, [ctx, teamName]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return agents;
}
