export function buildSpawnCommand(
  team: string,
  opts: { name?: string; task?: string; model?: string },
): string[] {
  const args = ["crew", "spawn", "--team", team];
  if (opts.name) args.push("--name", opts.name);
  if (opts.task) args.push("--task", opts.task);
  if (opts.model) args.push("--model", opts.model);
  return args;
}

export function buildCreateCommand(name: string): string[] {
  return ["crew", "create", "--name", name];
}

export function buildAttachCommand(team: string, agentName: string): string[] {
  return ["crew", "attach", "--team", team, "--name", agentName];
}
