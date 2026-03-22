/**
 * Returns the command prefix to invoke the crew CLI.
 * Handles both compiled binary (`dist/crew`) and dev mode (`bun run src/main.ts`).
 */
function crewBin(): string[] {
  const isCompiled = Bun.main.startsWith("/$bunfs/");
  if (isCompiled) {
    return [process.execPath];
  }
  return [process.execPath, "run", Bun.main];
}

export function buildCreateCommand(name: string, extraArgs?: string[]): string[] {
  const args = [...crewBin(), "team", "create", name];
  if (extraArgs?.length) args.push("--", ...extraArgs);
  return args;
}

export function buildStartCommand(team: string, agentName: string, extraArgs?: string[]): string[] {
  const args = [...crewBin(), "agent", "start", team, "--name", agentName];
  if (extraArgs?.length) args.push("--", ...extraArgs);
  return args;
}
