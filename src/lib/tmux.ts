export interface TmuxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function tmuxExec(
  args: string[],
  timeoutMs: number = 5000,
): Promise<TmuxResult> {
  const proc = Bun.spawn(["tmux", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const timer = setTimeout(() => {
    proc.kill();
  }, timeoutMs);

  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
  } finally {
    clearTimeout(timer);
  }
}
