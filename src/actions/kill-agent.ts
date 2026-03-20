import type { ProcessRegistry } from "../ports/process-registry.ts";
import type { Result } from "../types/result.ts";
import { killProcess } from "../lib/process.ts";
import { ok } from "../types/result.ts";

export async function killAgent(
  registry: ProcessRegistry | undefined,
  teamName: string,
  agentId: string,
): Promise<Result<boolean>> {
  if (registry) {
    return registry.kill(teamName, agentId);
  }
  // Fallback: no registry available
  return ok(false);
}

/** @deprecated Use killAgent with registry instead */
export function killAgentByPid(processId: string): void {
  const pid = parseInt(processId, 10);
  if (pid > 0) killProcess(pid);
}
