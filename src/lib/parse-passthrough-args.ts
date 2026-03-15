export function parsePassthroughArgs(rawArgs: string[]): string[] {
  const idx = rawArgs.indexOf("--");
  if (idx === -1) return [];
  return rawArgs.slice(idx + 1);
}
