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

export function ShortcutBar({ panel }: ShortcutBarProps) {
  const contextShortcuts = panel === "teams" ? teamShortcuts : [];
  const all = [...contextShortcuts, ...globalShortcuts];

  const text = all.map((s) => `[${s.key}] ${s.label}`).join("  ");

  return (
    <box height={1} paddingX={1}>
      <text content={text} fg="#565f89" />
    </box>
  );
}
