import { useCallback, useEffect, useMemo, useState } from "react";
import { listAgents } from "../../actions/list-agents.ts";
import { claudeInboxesDir, claudeTeamConfigPath, processRegistryPath } from "../../config/paths.ts";
import type { MemberDetail } from "../../core/status.ts";
import { debounce, watchDir, watchFile } from "../../lib/file-watcher.ts";
import type { AppContext } from "../../types/context.ts";

export interface AgentSummary {
  name: string;
  agentId: string;
  agentType: string;
  status: "alive" | "dead";
  processId?: number;
  sessionId?: string;
  model?: string;
  prompt?: string;
  color?: string;
  cwd: string;
  unreadCount: number;
  extraArgs?: string[];
}

export function toAgentSummary(member: MemberDetail, liveAgentIds: Set<string>): AgentSummary {
  return {
    ...member,
    status: liveAgentIds.has(member.agentId) ? "alive" : "dead",
  };
}

export function useAgents(ctx: AppContext, teamName: string | null) {
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

    // Get live agent IDs from registry if available
    let liveAgentIds = new Set<string>();
    if (ctx.processRegistry) {
      const activeResult = await ctx.processRegistry.listActive(teamName);
      if (activeResult.ok) {
        liveAgentIds = new Set(activeResult.value.map((e) => e.agentId));
      }
    }

    setAgents(result.value.map((m) => toAgentSummary(m, liveAgentIds)));
  }, [ctx, teamName]);

  const debouncedRefresh = useMemo(() => debounce(refresh, 200), [refresh]);

  useEffect(() => {
    refresh();
    if (!teamName) return;

    const cleanups: (() => void)[] = [];
    try {
      cleanups.push(watchFile(claudeTeamConfigPath(teamName), () => debouncedRefresh()));
    } catch {
      /* file may not exist */
    }
    try {
      cleanups.push(watchDir(claudeInboxesDir(teamName), () => debouncedRefresh()));
    } catch {
      /* dir may not exist */
    }
    try {
      cleanups.push(watchFile(processRegistryPath(teamName), () => debouncedRefresh()));
    } catch {
      /* file may not exist */
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, [refresh, debouncedRefresh, teamName]);

  return agents;
}
