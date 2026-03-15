import type { Panel } from "../views/navigation.ts";

interface ShortcutBarProps {
  panel: Panel;
}

interface Shortcut {
  key: string;
  label: string;
}

const globalShortcuts: Shortcut[] = [
  { key: "?", label: "help" },
  { key: "q", label: "quit" },
];

const teamShortcuts: Shortcut[] = [
  { key: "j/k", label: "navigate" },
  { key: "n", label: "new" },
  { key: "d", label: "destroy" },
];

const agentShortcuts: Shortcut[] = [
  { key: "j/k", label: "navigate" },
  { key: "s", label: "spawn" },
  { key: "a", label: "attach" },
  { key: "x", label: "kill" },
  { key: "r", label: "remove" },
  { key: "i", label: "inbox" },
  { key: "m", label: "msg" },
];

export function ShortcutBar({ panel }: ShortcutBarProps) {
  const contextShortcuts = panel === "teams" ? teamShortcuts : agentShortcuts;
  const all = [...contextShortcuts, { key: "tab", label: "switch panel" }, ...globalShortcuts];

  const text = all.map((s) => `[${s.key}] ${s.label}`).join("  ");

  return (
    <box height={1} paddingX={1}>
      <text content={text} fg="#565f89" />
    </box>
  );
}
