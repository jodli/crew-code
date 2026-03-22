import type { ProcessRegistry } from "../ports/process-registry.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";

export async function stopAgent(
  registry: ProcessRegistry | undefined,
  teamName: string,
  agentId: string,
): Promise<Result<boolean>> {
  if (registry) {
    return registry.stop(teamName, agentId);
  }
  return ok(false);
}
