import { describe, expect, test } from "bun:test";
import { truncateText, renderMessage, formatTimestamp, colorize, MAX_LINES } from "./format-message.ts";
import type { InboxMessage } from "../types/domain.ts";

describe("truncateText", () => {
  test("returns text unchanged when full=true", () => {
    const long = Array(20).fill("line").join("\n");
    expect(truncateText(long, true)).toBe(long);
  });

  test("returns text unchanged when under MAX_LINES", () => {
    const short = Array(MAX_LINES).fill("line").join("\n");
    expect(truncateText(short, false)).toBe(short);
  });

  test("truncates at MAX_LINES and appends indicator", () => {
    const lines = Array(MAX_LINES + 3).fill("line");
    const result = truncateText(lines.join("\n"), false);
    const resultLines = result.split("\n");
    // MAX_LINES of content + 1 truncation indicator
    expect(resultLines).toHaveLength(MAX_LINES + 1);
    expect(resultLines[MAX_LINES]).toContain("truncated");
  });
});

describe("formatTimestamp", () => {
  test("formats ISO string to YYYY-MM-DD HH:MM", () => {
    const result = formatTimestamp("2026-03-14T09:05:00Z");
    // Exact output depends on timezone, but format should be consistent
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe("colorize", () => {
  test("returns text unchanged when no color", () => {
    expect(colorize("hello")).toBe("hello");
    expect(colorize("hello", undefined)).toBe("hello");
  });

  test("returns text unchanged for unknown color", () => {
    expect(colorize("hello", "nonexistent-color")).toBe("hello");
  });

  test("applies known picocolors function without crashing", () => {
    const result = colorize("hello", "red");
    expect(result).toContain("hello");
  });
});

describe("renderMessage", () => {
  const base: InboxMessage = {
    from: "scout",
    text: "Hello world",
    timestamp: "2026-03-14T10:00:00Z",
    read: false,
  };

  test("renders JSON system message as label", () => {
    const msg: InboxMessage = {
      ...base,
      text: '{"type":"agent_idle","since":"2026-03-14T10:00:00Z"}',
    };
    const result = renderMessage(msg, false);
    expect(result).toContain("agent idle");
    expect(result).not.toContain('"type"');
  });

  test("renders summary when present", () => {
    const msg: InboxMessage = { ...base, summary: "Quick update" };
    const result = renderMessage(msg, false);
    expect(result).toContain("Quick update");
    expect(result).toContain("Hello world");
  });

  test("truncates long text when full=false", () => {
    const msg: InboxMessage = {
      ...base,
      text: Array(MAX_LINES + 5).fill("line").join("\n"),
    };
    const result = renderMessage(msg, false);
    expect(result).toContain("truncated");
  });

  test("does not truncate when full=true", () => {
    const msg: InboxMessage = {
      ...base,
      text: Array(MAX_LINES + 5).fill("line").join("\n"),
    };
    const result = renderMessage(msg, true);
    expect(result).not.toContain("truncated");
  });
});
