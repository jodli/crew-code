import { killProcess } from "../lib/process.ts";

export function killAgent(processId: string): void {
  const pid = parseInt(processId, 10);
  if (pid > 0) killProcess(pid);
}
