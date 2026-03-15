import { defineCommand } from "citty";
import pc from "picocolors";
import { confirm } from "@clack/prompts";
import { planRemove } from "../../core/remove.ts";
import { removeAgent } from "../../actions/remove-agent.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

export default defineCommand({
  meta: {
    name: "remove",
    description: "Remove an agent from a team (kill, delete inbox, remove from config)",
  },
  args: {
    team: {
      type: "string",
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
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const planResult = await planRemove(ctx, {
      team: args.team,
      name: args.name,
    });

    if (!planResult.ok) {
      console.error(renderError(planResult.error));
      process.exit(1);
    }

    const plan = planResult.value;

    if (!args.force) {
      console.log(`\nAbout to remove agent ${pc.bold(plan.name)} from team ${pc.bold(plan.team)}:`);
      if (plan.isAlive) {
        console.log(`  Kill process ${plan.processId} (active)`);
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
