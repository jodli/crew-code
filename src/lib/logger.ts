const isDebug = process.env.CREW_DEBUG === "1" || process.env.CREW_DEBUG === "true";

export function debug(area: string, message: string, data?: Record<string, unknown>): void {
  if (!isDebug) return;
  const ts = new Date().toISOString();
  const suffix = data ? ` ${JSON.stringify(data)}` : "";
  console.error(`[${ts}] DEBUG ${area}: ${message}${suffix}`);
}

export function warn(area: string, message: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const suffix = data ? ` ${JSON.stringify(data)}` : "";
  console.error(`[${ts}] WARN ${area}: ${message}${suffix}`);
}
