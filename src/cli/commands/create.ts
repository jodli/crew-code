import { defineCommand } from "citty";
import pc from "picocolors";
import { createTeam } from "../../core/create.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { TmuxLauncher } from "../../adapters/tmux-launcher.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

export default defineCommand({
  meta: {
    name: "create",
    description: "Create a new Claude agent team",
  },
  args: {
    name: {
      type: "string",
      description: "Team name",
      required: true,
    },
    description: {
      type: "string",
      description: "Team description",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      launcher: new TmuxLauncher(),
    };

    const result = await createTeam(ctx, {
      name: args.name,
      description: args.description || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(
      `Team ${pc.bold(result.value.name)} created.`,
    );
    console.error(`  Lead: ${result.value.leadAgentId}`);
  },
});
