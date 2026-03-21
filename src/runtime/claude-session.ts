import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function claudeSessionPath(cwd: string, sessionId: string): string {
  const encoded = `-${cwd.slice(1).replace(/\//g, "-").replace(/\./g, "-")}`;
  return join(homedir(), ".claude", "projects", encoded, `${sessionId}.jsonl`);
}

export function sessionExistsOnDisk(cwd: string, sessionId: string): boolean {
  return existsSync(claudeSessionPath(cwd, sessionId));
}
