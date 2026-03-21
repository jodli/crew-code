import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { claudeInboxPath } from "../../config/paths.ts";
import { watchFile } from "../../lib/file-watcher.ts";
import type { InboxStore } from "../../ports/inbox-store.ts";
import type { InboxMessage } from "../../types/domain.ts";

interface InboxViewProps {
  inboxStore: InboxStore;
  teamName: string;
  agentName: string;
  onClose: () => void;
  onSend: () => void;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

export function InboxView({ inboxStore, teamName, agentName, onClose, onSend }: InboxViewProps) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const load = async () => {
      const result = await inboxStore.readMessages(teamName, agentName);
      if (result.ok) {
        setMessages(result.value);
      }
    };
    load();
    let cleanup: (() => void) | undefined;
    try {
      cleanup = watchFile(claudeInboxPath(teamName, agentName), load);
    } catch {
      /* file may not exist */
    }
    return () => cleanup?.();
  }, [inboxStore, teamName, agentName]);

  const handleKey = useCallback(
    (key: KeyEvent) => {
      if (key.name === "escape" || key.name === "q") {
        onClose();
        return;
      }
      if (key.name === "m") {
        onSend();
        return;
      }
      if (key.name === "up" || key.name === "k") {
        setScrollOffset((o) => Math.max(0, o - 1));
      }
      if (key.name === "down" || key.name === "j") {
        setScrollOffset((o) => Math.min(messages.length - 1, o + 1));
      }
      if (key.name === "g") {
        setScrollOffset(0);
      }
      if (key.name === "G" || (key.shift && key.name === "g")) {
        setScrollOffset(Math.max(0, messages.length - 1));
      }
    },
    [onClose, onSend, messages.length],
  );

  useKeyboard(handleKey);

  if (messages.length === 0) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor="#7aa2f7"
        title={` Inbox: ${agentName} `}
        padding={1}
        flexDirection="column"
      >
        <text content="No messages." fg="#565f89" />
        <text content="" />
        <text content='Press "m" to send a message, Esc to go back.' fg="#565f89" />
      </box>
    );
  }

  // Build message lines with unread separator
  const lines: { content: string; fg: string }[] = [];
  let unreadSeparatorPlaced = false;

  for (const msg of messages) {
    if (!msg.read && !unreadSeparatorPlaced) {
      lines.push({ content: "── unread ──────────────────────────────", fg: "#e0af68" });
      unreadSeparatorPlaced = true;
    }

    const time = formatTimestamp(msg.timestamp);
    const from = msg.from || "unknown";
    lines.push({
      content: `[${time}]  from: ${from}`,
      fg: msg.read ? "#565f89" : "#7aa2f7",
    });
    lines.push({
      content: `  ${msg.text}`,
      fg: msg.read ? "#a9b1d6" : "#c0caf5",
    });
    lines.push({ content: "", fg: "#565f89" });
  }

  // Simple scroll: show lines starting from scrollOffset
  const visibleLines = lines.slice(scrollOffset);

  return (
    <box
      flexGrow={1}
      border
      borderStyle="rounded"
      borderColor="#7aa2f7"
      title={` Inbox: ${agentName} (${messages.filter((m) => !m.read).length} unread) `}
      flexDirection="column"
      paddingX={1}
    >
      <box flexGrow={1} flexDirection="column">
        {visibleLines.map((line) => (
          <text key={line.content} content={line.content} fg={line.fg} />
        ))}
      </box>
      <box height={1}>
        <text content="[j/k] scroll  [g/G] top/bottom  [m] send message  [Esc] back" fg="#565f89" />
      </box>
    </box>
  );
}
