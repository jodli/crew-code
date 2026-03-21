import { useCallback, useEffect, useMemo, useState } from "react";
import { claudeTeamsDir } from "../../config/paths.ts";
import { debounce, watchDir } from "../../lib/file-watcher.ts";
import type { ConfigStore } from "../../ports/config-store.ts";
import type { ProcessRegistry } from "../../ports/process-registry.ts";
import type { TeamConfig } from "../../types/domain.ts";

export interface TeamSummary {
  name: string;
  description?: string;
  agentCount: number;
  aliveCount: number;
  createdAt: number;
}

function summarizeTeam(config: TeamConfig, liveAgentIds: Set<string>): TeamSummary {
  const aliveCount = config.members.filter((m) => liveAgentIds.has(m.agentId)).length;

  return {
    name: config.name,
    description: config.description,
    agentCount: config.members.length,
    aliveCount,
    createdAt: config.createdAt,
  };
}

export function useTeams(configStore: ConfigStore, processRegistry?: ProcessRegistry) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);

  const refresh = useCallback(async () => {
    const namesResult = await configStore.listTeams();
    if (!namesResult.ok) return;

    const configs = await Promise.all(namesResult.value.map((n) => configStore.getTeam(n)));

    const validConfigs = configs.filter((r) => r.ok).map((r) => r.value);

    // Collect live agent IDs from registry for all teams
    const liveAgentIds = new Set<string>();
    if (processRegistry) {
      for (const config of validConfigs) {
        const activeResult = await processRegistry.listActive(config.name);
        if (activeResult.ok) {
          for (const entry of activeResult.value) {
            liveAgentIds.add(entry.agentId);
          }
        }
      }
    }

    setTeams(validConfigs.map((c) => summarizeTeam(c, liveAgentIds)));
  }, [configStore, processRegistry]);

  const debouncedRefresh = useMemo(() => debounce(refresh, 200), [refresh]);

  useEffect(() => {
    refresh();
    const cleanups: (() => void)[] = [];
    try {
      cleanups.push(watchDir(claudeTeamsDir(), () => debouncedRefresh()));
    } catch {
      /* dir may not exist */
    }
    return () => {
      for (const c of cleanups) c();
    };
  }, [refresh, debouncedRefresh]);

  return teams;
}
