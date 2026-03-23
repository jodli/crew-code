import { defineCommand } from "citty";
import pc from "picocolors";
import { getBlueprint } from "../../../actions/get-blueprint.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "show",
    description: "Show blueprint details",
  },
  args: {
    name: {
      type: "positional",
      description: "Blueprint name",
      required: true,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    const result = await getBlueprint(ctx, args.name);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    const bp = result.value;

    console.error(pc.bold(`Blueprint: ${bp.name}`));
    if (bp.description) {
      console.error(`  ${bp.description}`);
    }
    console.error(`\nAgents (${bp.agents.length}):`);
    for (const agent of bp.agents) {
      const type = agent.agentType ?? "general-purpose";
      const model = agent.model ? ` model=${agent.model}` : "";
      const color = agent.color ? ` color=${agent.color}` : "";
      console.error(`  - ${pc.cyan(agent.name)} [${type}]${model}${color}`);
      if (agent.cwd) {
        console.error(`    cwd: ${agent.cwd}`);
      }
      if (agent.prompt) {
        console.error(`    prompt: ${agent.prompt}`);
      }
    }
  },
});
