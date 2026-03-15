export function buildSpawnCommand(
  team: string,
  opts: { name?: string; task?: string; model?: string; extraArgs?: string[] },
): string[] {
  const args = ["crew", "spawn", "--team", team];
  if (opts.name) args.push("--name", opts.name);
  if (opts.task) args.push("--task", opts.task);
  if (opts.model) args.push("--model", opts.model);
  if (opts.extraArgs?.length) args.push("--", ...opts.extraArgs);
  return args;
}

export function buildCreateCommand(name: string, extraArgs?: string[]): string[] {
  const args = ["crew", "create", "--name", name];
  if (extraArgs?.length) args.push("--", ...extraArgs);
  return args;
}

export function buildAttachCommand(team: string, agentName: string, extraArgs?: string[]): string[] {
  const args = ["crew", "attach", "--team", team, "--name", agentName];
  if (extraArgs?.length) args.push("--", ...extraArgs);
  return args;
}
