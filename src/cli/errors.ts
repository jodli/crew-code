import type { CrewError } from "../types/errors.ts";

const messages: Record<string, (e: CrewError) => string> = {
  team_not_found: (e) =>
    `Team "${(e as { team: string }).team}" not found. Check ~/.claude/teams/ or create one first.`,
  agent_already_exists: (e) => {
    const { agent, team } = e as { agent: string; team: string };
    return `Agent "${agent}" already exists in team "${team}". Pick a different name.`;
  },
  config_corrupt: (e) => {
    const { team, detail } = e as { team: string; detail: string };
    return `Config for team "${team}" is corrupt: ${detail}`;
  },
  config_not_found: (e) =>
    `Config not found at ${(e as { path: string }).path}`,
  file_read_failed: (e) => {
    const { path, detail } = e as { path: string; detail: string };
    return `Failed to read ${path}: ${detail}`;
  },
  file_write_failed: (e) => {
    const { path, detail } = e as { path: string; detail: string };
    return `Failed to write ${path}: ${detail}`;
  },
  lock_failed: (e) => {
    const { path, detail } = e as { path: string; detail: string };
    return `Failed to lock ${path}: ${detail}`;
  },
  json_parse_failed: (e) => {
    const { path, detail } = e as { path: string; detail: string };
    return `Invalid JSON in ${path}: ${detail}`;
  },
  schema_validation_failed: (e) => {
    const { path, detail } = e as { path: string; detail: string };
    return `Schema validation failed for ${path}: ${detail}`;
  },
  claude_not_installed: () =>
    "Claude Code CLI not found. Install it from https://claude.ai/code",
  launch_failed: (e) =>
    `Failed to launch agent: ${(e as { detail: string }).detail}`,
  preflight_failed: (e) =>
    `Preflight check failed: ${(e as { detail: string }).detail}`,
  spawn_failed: (e) =>
    `Spawn failed: ${(e as { detail: string }).detail}`,
  team_already_exists: (e) =>
    `Team "${(e as { team: string }).team}" already exists.`,
  agent_not_found: (e) => {
    const { agent, team } = e as { agent: string; team: string };
    return `Agent "${agent}" not found in team "${team}".`;
  },
  no_session_id: (e) => {
    const { agent, team } = e as { agent: string; team: string };
    return `Agent "${agent}" in team "${team}" has no stored session ID. It was created before session tracking was added.`;
  },
  lead_already_exists: (e) =>
    `Team "${(e as { team: string }).team}" already has a lead agent.`,
  stale_session: (e) => {
    const { agent, team } = e as { agent: string; team: string };
    return `Agent "${agent}" in team "${team}" has a stale session (no conversation on disk). Run "crew doctor --team ${team}" to fix.`;
  },
  blueprint_not_found: (e) =>
    `Blueprint "${(e as { name: string }).name}" not found.`,
  blueprint_invalid: (e) => {
    const { name, detail } = e as { name: string; detail: string };
    return `Blueprint "${name}" is invalid: ${detail}`;
  },
  blueprint_already_exists: (e) =>
    `Blueprint "${(e as { name: string }).name}" already exists.`,
};

export function renderError(e: CrewError): string {
  const renderer = messages[e.kind];
  if (renderer) return renderer(e);
  const { kind, ...rest } = e;
  const extra =
    Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${kind}]${extra}`;
}

export function exitWithError(e: CrewError): never {
  console.error(renderError(e));
  process.exit(1);
}
