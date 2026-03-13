import { defineCommand } from "citty";
import pc from "picocolors";
import { getInbox } from "../../core/inbox.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { TmuxLauncher } from "../../adapters/tmux-launcher.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";
import type { InboxMessage } from "../../types/domain.ts";

const MAX_LINES = 5;

function colorize(text: string, color?: string): string {
  if (!color) return text;
  const fn = (pc as Record<string, (s: string) => string>)[color];
  return fn ? fn(text) : text;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncateText(text: string, full: boolean): string {
  if (full) return text;
  const lines = text.split("\n");
  if (lines.length <= MAX_LINES) return text;
  return (
    lines.slice(0, MAX_LINES).join("\n") +
    "\n" +
    pc.dim("[truncated — use --full to see complete message]")
  );
}

function renderMessage(msg: InboxMessage, full: boolean): string {
  const indicator = msg.read ? pc.dim("○") : pc.yellow("●");
  const time = formatTimestamp(msg.timestamp);
  const sender = colorize(msg.from, msg.color);
  const parts: string[] = [];

  parts.push(`  ${indicator} ${pc.dim(time)}  ${sender}`);
  if (msg.summary) {
    parts.push(`  ${pc.dim(msg.summary)}`);
  }
  parts.push(
    truncateText(msg.text, full)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
  );

  return parts.join("\n");
}

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
      launcher: new TmuxLauncher(),
    };

    const result = await getInbox(ctx, args.team, args.agent, {
      unreadOnly: args.unread || false,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    const { messages, totalCount, unreadCount, team, agent } = result.value;

    console.log(
      `${pc.bold(team)} / ${pc.bold(agent)} — ${totalCount} messages (${unreadCount} unread)`,
    );

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
