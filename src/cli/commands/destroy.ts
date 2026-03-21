import { confirm } from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";
import { destroyTeam } from "../../actions/destroy-team.ts";
import { FileProcessRegistry } from "../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { planDestroy } from "../../core/destroy.ts";
import type { AppContext } from "../../types/context.ts";
import { renderError } from "../errors.ts";

export default defineCommand({
  meta: {
    name: "destroy",
    description: "Destroy a team, kill agents, and clean up files",
  },
  args: {
    team: {
      type: "string",
      description: "Team name",
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

    const planResult = await planDestroy(ctx, { team: args.team }, processRegistry);
    if (!planResult.ok) {
      console.error(renderError(planResult.error));
      process.exit(1);
    }

    const plan = planResult.value;

    if (!args.force) {
      console.log(`\nAbout to destroy team ${pc.bold(plan.team)}:`);
      if (plan.activeAgents.length > 0) {
        console.log(
          `  Kill ${plan.activeAgents.length} active agent(s): ${plan.activeAgents.map((a) => a.name).join(", ")}`,
        );
      }
      if (plan.inboxes.length > 0) {
        console.log(`  Delete ${plan.inboxes.length} inbox file(s)`);
      }
      console.log("  Remove team directory\n");

      const confirmed = await confirm({
        message: "Are you sure?",
      });

      if (!confirmed || typeof confirmed === "symbol") {
        console.log("Aborted.");
        return;
      }
    }

    const result = await destroyTeam(ctx, { team: args.team });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.log(`Team ${pc.bold(args.team)} destroyed.`);
  },
});
