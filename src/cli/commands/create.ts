import { defineCommand } from "citty";
import pc from "picocolors";
import { createTeam } from "../../actions/create-team.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../types/context.ts";
import { renderError } from "../errors.ts";

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
    };

    const result = await createTeam(ctx, {
      name: args.name,
      description: args.description || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Team ${pc.bold(result.value.name)} created.`);
    console.error(`\n  Spawn a lead agent:`);
    console.error(`  ${pc.cyan(`crew spawn --team ${args.name} --agent-type team-lead --name team-lead`)}\n`);
  },
});
