import { confirm } from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";
import { removeAgent } from "../../../actions/remove-agent.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { planRemoveAgent } from "../../../core/remove.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "remove",
    description: "Remove an agent from a team",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name to remove",
      required: true,
    },
    force: {
      type: "boolean",
      description: "Skip confirmation prompt",
      required: false,
    },
  },
  async run({ args }) {
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const planResult = await planRemoveAgent(
      ctx,
      {
        team: args.team,
        name: args.name,
      },
      processRegistry,
    );

    if (!planResult.ok) {
      console.error(renderError(planResult.error));
      process.exit(1);
    }

    const plan = planResult.value;

    if (!args.force) {
      console.log(`\nAbout to remove agent ${pc.bold(plan.name)} from team ${pc.bold(plan.team)}:`);
      if (plan.isAlive) {
        console.log("  Kill running process (active)");
      }
      if (plan.hasInbox) {
        console.log("  Delete inbox");
      }
      console.log("  Remove from team config\n");

      const confirmed = await confirm({
        message: "Are you sure?",
      });

      if (!confirmed || typeof confirmed === "symbol") {
        console.log("Aborted.");
        return;
      }
    }

    const result = await removeAgent(ctx, { team: args.team, name: args.name });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.log(`Agent ${pc.bold(args.name)} removed from team ${pc.bold(args.team)}.`);
  },
});
