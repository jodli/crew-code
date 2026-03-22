import { confirm } from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";
import { removeTeam } from "../../../actions/remove-team.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { planRemoveTeam } from "../../../core/remove-team.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "remove",
    description: "Remove a team",
  },
  args: {
    name: {
      type: "positional",
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

    const planResult = await planRemoveTeam(ctx, { team: args.name }, processRegistry);
    if (!planResult.ok) {
      console.error(renderError(planResult.error));
      process.exit(1);
    }

    const plan = planResult.value;

    if (!args.force) {
      console.log(`\nAbout to remove team ${pc.bold(plan.team)}:`);
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

    const result = await removeTeam(ctx, { team: args.name });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.log(`Team ${pc.bold(args.name)} removed.`);
  },
});
