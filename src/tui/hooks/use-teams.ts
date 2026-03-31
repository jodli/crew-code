import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { claudeTeamsDir, processRegistryPath } from "../../config/paths.ts";
import { debounce, watchDir, watchFile } from "../../lib/file-watcher.ts";
import type { ConfigStore } from "../../ports/config-store.ts";
import type { ProcessRegistry } from "../../ports/process-registry.ts";
import type { TeamConfig } from "../../types/domain.ts";

export interface TeamSummary {
  name: string;
  description?: string;
  agentCount: number;
  runningCount: number;
  createdAt: number;
}

function summarizeTeam(config: TeamConfig, runningAgentIds: Set<string>): TeamSummary {
  const runningCount = config.members.filter((m) => runningAgentIds.has(m.agentId)).length;

  return {
    name: config.name,
    description: config.description,
    agentCount: config.members.length,
    runningCount,
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
    const runningAgentIds = new Set<string>();
    if (processRegistry) {
      for (const config of validConfigs) {
        const activeResult = await processRegistry.listActive(config.name);
        if (activeResult.ok) {
          for (const entry of activeResult.value) {
            runningAgentIds.add(entry.agentId);
          }
        }
      }
    }

    setTeams(validConfigs.map((c) => summarizeTeam(c, runningAgentIds)));
  }, [configStore, processRegistry]);

  const debouncedRefresh = useMemo(() => debounce(refresh, 200), [refresh]);
  const watchedTeams = useRef(new Set<string>());
  const registryCleanups = useRef<(() => void)[]>([]);

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
      for (const c of registryCleanups.current) c();
      registryCleanups.current = [];
      watchedTeams.current.clear();
    };
  }, [refresh, debouncedRefresh]);

  // Add registry watchers for newly discovered teams (additive, no teardown cycle)
  for (const team of teams) {
    if (!watchedTeams.current.has(team.name)) {
      watchedTeams.current.add(team.name);
      try {
        registryCleanups.current.push(watchFile(processRegistryPath(team.name), () => debouncedRefresh()));
      } catch {
        /* file may not exist yet */
      }
    }
  }

  return teams;
}
