import { defineCommand } from "citty";
import type { BackendType } from "../../tui/launcher/detect.ts";

export default defineCommand({
  meta: {
    name: "tui",
    description: "Launch interactive TUI dashboard",
  },
  args: {
    backend: {
      type: "string",
      description: "Launcher backend: tmux or terminal",
      required: false,
    },
  },
  async run({ args }) {
    const { startTui } = await import("../../tui/main.tsx");
    const backend = args.backend as BackendType | undefined;
    await startTui(backend || undefined);
  },
});
