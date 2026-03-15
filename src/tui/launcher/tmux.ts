import type { Launcher } from "./port.ts";

export class TmuxLauncher implements Launcher {
  readonly name = "tmux";

  async openTerminal(command: string[], cwd: string, label?: string): Promise<void> {
    const args = [
      "new-window",
      "-d",
      "-c", cwd,
      ...(label ? ["-n", label] : []),
      "--",
      ...command,
    ];

    const proc = Bun.spawn(["tmux", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const code = await proc.exited;
    if (code !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`tmux new-window failed (exit ${code}): ${stderr.trim()}`);
    }
  }
}
