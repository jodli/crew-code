import { defineCommand } from "citty";
import pc from "picocolors";
import { getCrewMessages } from "../../actions/get-crew-channel.ts";
import { markCrewMessagesRead } from "../../core/crew-channel.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { renderError } from "../errors.ts";
import { renderMessage } from "../format-message.ts";
import { watchFile } from "../../lib/file-watcher.ts";
import { claudeInboxPath } from "../../config/paths.ts";
import { CREW_SENDER } from "../../types/constants.ts";
import type { AppContext } from "../../types/context.ts";

async function showMessages(
  ctx: AppContext,
  team: string,
  opts: { unread: boolean; full: boolean },
): Promise<{ totalCount: number; unreadCount: number } | null> {
  const result = await getCrewMessages(ctx, team, {
    unreadOnly: opts.unread,
  });

  if (!result.ok) {
    console.error(renderError(result.error));
    return null;
  }

  const { messages, totalCount, unreadCount } = result.value;

  console.log(
    `${pc.bold(team)} crew channel — ${totalCount} messages (${unreadCount} unread)`,
  );

  if (messages.length === 0) {
    console.log(`\n  ${pc.dim("No messages.")}`);
  } else {
    for (const msg of messages) {
      console.log("");
      console.log(renderMessage(msg, opts.full));
    }
  }

  if (unreadCount > 0) {
    await markCrewMessagesRead(ctx, team);
  }

  return { totalCount, unreadCount };
}

export default defineCommand({
  meta: {
    name: "messages",
    description: "View messages agents sent to crew",
  },
  args: {
    team: {
      type: "string",
      description: "Team name",
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
    watch: {
      type: "boolean",
      description: "Watch for new messages",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const full = args.full || false;

    if (!args.watch) {
      const shown = await showMessages(ctx, args.team, { unread: args.unread || false, full });
      if (!shown) process.exit(1);
      return;
    }

    // Watch mode: show existing, then watch for new
    const initial = await showMessages(ctx, args.team, { unread: false, full });
    if (!initial) process.exit(1);
    let lastSeen = initial.totalCount;

    console.error(pc.dim(`\nWatching for new messages... (Ctrl+C to stop)`));

    const inboxPath = claudeInboxPath(args.team, CREW_SENDER);
    const cleanup = watchFile(inboxPath, async () => {
      try {
        const result = await getCrewMessages(ctx, args.team);
        if (!result.ok) return;

        const newMessages = result.value.messages.slice(lastSeen);
        if (newMessages.length === 0) return;

        for (const msg of newMessages) {
          console.log("");
          console.log(renderMessage(msg, full));
        }

        lastSeen = result.value.totalCount;

        if (result.value.unreadCount > 0) {
          await markCrewMessagesRead(ctx, args.team);
        }
      } catch {
        // transient errors: ignore, next callback will retry
      }
    });

    const shutdown = () => {
      cleanup();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Keep process alive
    await new Promise(() => {});
  },
});
