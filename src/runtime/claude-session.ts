import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function claudeSessionPath(cwd: string, sessionId: string): string {
  const encoded = "-" + cwd.slice(1).replace(/\//g, "-").replace(/\./g, "-");
  return join(homedir(), ".claude", "projects", encoded, `${sessionId}.jsonl`);
}

export function sessionExistsOnDisk(cwd: string, sessionId: string): boolean {
  return existsSync(claudeSessionPath(cwd, sessionId));
}
