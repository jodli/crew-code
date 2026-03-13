import { join } from "node:path";
import { homedir } from "node:os";

export function claudeTeamsDir(): string {
  return join(homedir(), ".claude", "teams");
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
