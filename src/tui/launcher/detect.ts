import type { Launcher } from "./port.ts";
import { TmuxLauncher } from "./tmux.ts";
import { TerminalLauncher } from "./terminal.ts";

export type BackendType = "tmux" | "terminal";

export function detectBackend(): BackendType {
  if (process.env.TMUX) return "tmux";
  return "terminal";
}

export function createLauncher(override?: BackendType): Launcher {
  const backend = override ?? detectBackend();
  switch (backend) {
    case "tmux":
      return new TmuxLauncher();
    case "terminal":
      return new TerminalLauncher();
  }
}
