import { defineCommand } from "citty";
import pc from "picocolors";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { planLoad, executeLoad } from "../../../core/blueprint-load.ts";
import { renderError } from "../../errors.ts";
import type { AppContext } from "../../../types/context.ts";

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

    const plan = await planLoad(ctx, { nameOrPath: args.blueprint });
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
      console.error(`\nWould create team "${blueprint.name}" with:`);
      console.error(`  - team-lead`);
      for (const agent of blueprint.agents) {
        const model = agent.model ? ` (${agent.model})` : "";
        console.error(`  - ${agent.name}${model}`);
      }
      return;
    }

    const result = await executeLoad(ctx, plan.value);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(pc.bold(`Team "${result.value.teamName}" created from blueprint.`));
    console.error(`\nAttach to agents:`);
    for (const opts of result.value.launchOptions) {
      console.error(`  crew attach --team ${result.value.teamName} --name ${opts.agentName}`);
    }
  },
});
