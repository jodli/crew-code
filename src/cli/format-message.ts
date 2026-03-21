import pc from "picocolors";
import type { InboxMessage } from "../types/domain.ts";

export const MAX_LINES = 5;

export function colorize(text: string, color?: string): string {
  if (!color) return text;
  const fn = (pc as Record<string, (s: string) => string>)[color];
  return fn ? fn(text) : text;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function truncateText(text: string, full: boolean): string {
  if (full) return text;
  const lines = text.split("\n");
  if (lines.length <= MAX_LINES) return text;
  return (
    lines.slice(0, MAX_LINES).join("\n") +
    "\n" +
    pc.dim("[truncated — use --full to see complete message]")
  );
}

export function renderMessage(msg: InboxMessage, full: boolean): string {
  const indicator = msg.read ? pc.dim("○") : pc.yellow("●");
  const time = formatTimestamp(msg.timestamp);
  const sender = colorize(msg.from, msg.color);
  const parts: string[] = [];

  parts.push(`  ${indicator} ${pc.dim(time)}  ${sender}`);

  // Detect JSON system messages (e.g. idle notifications)
  try {
    const parsed = JSON.parse(msg.text);
    if (parsed && typeof parsed === "object" && parsed.type) {
      const label = parsed.type.replace(/_/g, " ");
      parts.push(`  ${pc.dim(`[${label}]`)}`);
      return parts.join("\n");
    }
  } catch {}

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
