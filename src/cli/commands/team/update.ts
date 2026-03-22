import { defineCommand } from "citty";
import { updateTeam } from "../../../actions/update-team.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "update",
    description: "Update team properties",
  },
  args: {
    name: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    description: {
      type: "string",
      alias: "d",
      description: "Update team description",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    if (args.description === undefined) {
      console.error("Nothing to update. Use --description to set a new description.");
      process.exit(1);
    }

    const result = await updateTeam(ctx, {
      team: args.name,
      description: args.description,
    });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }
    console.error(`Team "${args.name}" updated.`);
  },
});
