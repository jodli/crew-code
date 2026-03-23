import type { Blueprint, BlueprintAgent } from "../config/blueprint-schema.ts";
import type { TeamConfig } from "../types/domain.ts";

export function teamToBlueprint(config: TeamConfig): Blueprint {
  const agents: BlueprintAgent[] = config.members.map((m) => {
    const agent: BlueprintAgent = { name: m.name, agentType: m.agentType };
    if (m.prompt) agent.prompt = m.prompt;
    if (m.model) agent.model = m.model;
    if (m.color) agent.color = m.color;
    if (m.cwd) agent.cwd = m.cwd;
    if (m.extraArgs?.length) agent.extraArgs = m.extraArgs;
    return agent;
  });

  const bp: Blueprint = {
    name: config.name,
    agents,
  };
  if (config.description) bp.description = config.description;
  return bp;
}
