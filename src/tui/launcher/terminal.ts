import type { Launcher } from "./port.ts";

export type TerminalEmulator = "ghostty" | "alacritty" | "xdg-terminal-exec";

export function detectTerminalEmulator(): TerminalEmulator {
  // Check $TERMINAL env var first
  const termEnv = process.env.TERMINAL;
  if (termEnv) {
    if (termEnv.includes("ghostty")) return "ghostty";
    if (termEnv.includes("alacritty")) return "alacritty";
  }

  // Check what's in PATH
  try {
    const result = Bun.spawnSync(["which", "ghostty"]);
    if (result.exitCode === 0) return "ghostty";
  } catch {}

  try {
    const result = Bun.spawnSync(["which", "alacritty"]);
    if (result.exitCode === 0) return "alacritty";
  } catch {}

  return "xdg-terminal-exec";
}

export function buildTerminalCommand(
  emulator: TerminalEmulator,
  command: string[],
  cwd: string,
): string[] {
  switch (emulator) {
    case "ghostty":
      return ["ghostty", `--working-directory=${cwd}`, "-e", ...command];
    case "alacritty":
      return ["alacritty", "--working-directory", cwd, "-e", ...command];
    case "xdg-terminal-exec":
      // xdg-terminal-exec has no --working-directory, wrap with cd
      return ["xdg-terminal-exec", "sh", "-c", `cd ${shellEscape(cwd)} && exec ${command.map(shellEscape).join(" ")}`];
  }
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

export class TerminalLauncher implements Launcher {
  readonly name: string;
  private emulator: TerminalEmulator;

  constructor(emulator?: TerminalEmulator) {
    this.emulator = emulator ?? detectTerminalEmulator();
    this.name = `terminal:${this.emulator}`;
  }

  async openTerminal(command: string[], cwd: string, _label?: string): Promise<void> {
    const args = buildTerminalCommand(this.emulator, command, cwd);
    Bun.spawn(args, {
      stdout: "ignore",
      stderr: "ignore",
    });
    // Fire and forget — the terminal process runs independently
  }
}
