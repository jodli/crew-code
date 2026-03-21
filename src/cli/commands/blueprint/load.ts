import { defineCommand } from "citty";
import pc from "picocolors";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { executeLoad, planLoad } from "../../../core/blueprint-load.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "load",
    description: "Create a team from a blueprint",
  },
  args: {
    blueprint: {
      type: "positional",
      description: "Blueprint name or file path",
      required: true,
    },
    name: {
      type: "string",
      alias: "n",
      description: "Override team name (default: blueprint name)",
      required: false,
    },
    "dry-run": {
      type: "boolean",
      description: "Preview what would be created without doing it",
      required: false,
      default: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    const plan = await planLoad(ctx, { nameOrPath: args.blueprint, teamName: args.name });
    if (!plan.ok) {
      console.error(renderError(plan.error));
      process.exit(1);
    }

    const { blueprint } = plan.value;

    if (args["dry-run"]) {
      console.error(pc.bold(`Blueprint: ${blueprint.name}`));
      if (blueprint.description) {
        console.error(`  ${blueprint.description}`);
      }
      console.error(`\nWould create team "${plan.value.teamName}" with:`);
      for (const agent of blueprint.agents) {
        const model = agent.model ? ` (${agent.model})` : "";
        const type = agent.agentType ? ` [${agent.agentType}]` : "";
        console.error(`  - ${agent.name}${model}${type}`);
      }
      return;
    }

    const result = await executeLoad(ctx, plan.value);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(pc.bold(`Team "${result.value.teamName}" created from blueprint.`));
    if (!result.value.hasLead) {
      console.error(`\n  ${pc.yellow("Warning:")} No team-lead agent in blueprint. Spawn one for permission requests:`);
      console.error(
        `  ${pc.cyan(`crew spawn --team ${result.value.teamName} --agent-type team-lead --name team-lead`)}`,
      );
    }
    console.error(`\nAttach to agents:`);
    for (const opts of result.value.launchOptions) {
      console.error(`  crew attach --team ${result.value.teamName} --name ${opts.agentName}`);
    }
  },
});
