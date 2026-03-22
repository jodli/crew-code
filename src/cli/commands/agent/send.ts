import { defineCommand } from "citty";
import pc from "picocolors";
import { sendMessage } from "../../../actions/send-message.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "send",
    description: "Send a message to an agent's inbox",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name",
      required: true,
    },
    message: {
      type: "string",
      description: "Message text",
      required: true,
    },
    from: {
      type: "string",
      description: "Sender name (defaults to 'crew')",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await sendMessage(ctx, {
      team: args.team,
      agent: args.name,
      message: args.message,
      from: args.from || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Message sent to ${pc.bold(args.name)} in team ${pc.bold(args.team)}.`);
  },
});
