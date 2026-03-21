import { defineCommand } from "citty";
import pc from "picocolors";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { getInbox } from "../../core/inbox.ts";
import type { AppContext } from "../../types/context.ts";
import { renderError } from "../errors.ts";
import { renderMessage } from "../format-message.ts";

export default defineCommand({
  meta: {
    name: "inbox",
    description: "View messages in an agent's inbox",
  },
  args: {
    team: {
      type: "string",
      description: "Team name",
      required: true,
    },
    agent: {
      type: "string",
      description: "Agent name",
      required: true,
    },
    unread: {
      type: "boolean",
      description: "Show only unread messages",
      required: false,
    },
    full: {
      type: "boolean",
      description: "Show full message text (no truncation)",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await getInbox(ctx, args.team, args.agent, {
      unreadOnly: args.unread || false,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    const { messages, totalCount, unreadCount, team, agent } = result.value;

    console.log(`${pc.bold(team)} / ${pc.bold(agent)} — ${totalCount} messages (${unreadCount} unread)`);

    if (messages.length === 0) {
      console.log(`\n  ${pc.dim("No messages.")}`);
      return;
    }

    for (const msg of messages) {
      console.log("");
      console.log(renderMessage(msg, args.full || false));
    }
  },
});
