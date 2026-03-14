import { useState, useEffect, useCallback } from "react";
import type { ConfigStore } from "../../ports/config-store.ts";
import type { TeamConfig } from "../../types/domain.ts";
import { isProcessAlive } from "../../lib/process.ts";

export interface TeamSummary {
  name: string;
  agentCount: number;
  aliveCount: number;
  createdAt: number;
}

function summarizeTeam(config: TeamConfig): TeamSummary {
  const agents = config.members;
  const aliveCount = agents.filter((m) => {
    const pid = parseInt(m.processId, 10);
    return pid > 0 && isProcessAlive(pid);
  }).length;

  return {
    name: config.name,
    agentCount: agents.length,
    aliveCount,
    createdAt: config.createdAt,
  };
}

export function useTeams(
  configStore: ConfigStore,
  pollIntervalMs = 2000,
) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);

  const refresh = useCallback(async () => {
    const namesResult = await configStore.listTeams();
    if (!namesResult.ok) return;

    const configs = await Promise.all(
      namesResult.value.map((n) => configStore.getTeam(n)),
    );

    setTeams(
      configs
        .filter((r) => r.ok)
        .map((r) => summarizeTeam(r.value)),
    );
  }, [configStore]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return teams;
}
