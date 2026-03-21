import { join } from "node:path";
import { homedir } from "node:os";
import envPaths from "env-paths";

export function claudeTeamsDir(): string {
  return process.env.CREW_TEAMS_DIR ?? join(homedir(), ".claude", "teams");
}

export function claudeTeamDir(name: string): string {
  return join(claudeTeamsDir(), name);
}

export function claudeTeamConfigPath(name: string): string {
  return join(claudeTeamDir(name), "config.json");
}

export function claudeInboxesDir(name: string): string {
  return join(claudeTeamDir(name), "inboxes");
}

export function claudeInboxPath(name: string, agent: string): string {
  return join(claudeInboxesDir(name), `${agent}.json`);
}

const paths = envPaths("crew", { suffix: "" });

export function blueprintsDir(): string {
  return join(paths.config, "blueprints");
}

export function blueprintPath(name: string): string {
  return join(blueprintsDir(), `${name}.yaml`);
}

export function processRegistryDir(teamName: string): string {
  return join(paths.data, teamName);
}

export function processRegistryPath(teamName: string): string {
  return join(paths.data, teamName, "processes.json");
}
