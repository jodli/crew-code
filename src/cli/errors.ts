import type { CrewError } from "../types/errors.ts";

/**
 * Formats a CrewError into a human-readable string.
 * Specific error-to-message mappings added as each phase introduces its error variants.
 */
export function renderError(e: CrewError): string {
  const { kind, ...rest } = e;
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${kind}]${extra}`;
}

/**
 * Writes the error to stderr and exits with code 1.
 * Only call this at the CLI boundary, never from core logic.
 */
export function exitWithError(e: CrewError): never {
  console.error(renderError(e));
  process.exit(1);
}
