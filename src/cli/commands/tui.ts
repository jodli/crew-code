import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "tui",
    description: "Launch interactive TUI dashboard",
  },
  args: {},
  async run() {
    const { startTui } = await import("../../tui/main.tsx");
    await startTui();
  },
});
