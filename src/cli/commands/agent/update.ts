import { defineCommand } from "citty";
import { updateAgent } from "../../../actions/update-agent.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "update",
    description: "Update agent properties",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name to update",
      required: true,
    },
    model: {
      type: "string",
      description: "Update agent model",
      required: false,
    },
    color: {
      type: "string",
      description: "Update agent color",
      required: false,
    },
    prompt: {
      type: "string",
      description: "Update agent prompt",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    if (!args.model && !args.color && !args.prompt) {
      console.error("Nothing to update. Use --model, --color, or --prompt.");
      process.exit(1);
    }

    const result = await updateAgent(ctx, {
      team: args.team,
      name: args.name,
      model: args.model,
      color: args.color,
      prompt: args.prompt,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Agent "${args.name}" in team "${args.team}" updated.`);
  },
});
