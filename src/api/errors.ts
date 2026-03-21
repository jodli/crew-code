import type { Context } from "hono";
import type { CrewError } from "../types/errors.ts";
import { renderError } from "../cli/errors.ts";

const notFound = new Set([
  "team_not_found",
  "agent_not_found",
  "blueprint_not_found",
  "config_not_found",
]);

const conflict = new Set([
  "team_already_exists",
  "agent_already_exists",
  "blueprint_already_exists",
]);

const unprocessable = new Set([
  "blueprint_invalid",
  "schema_validation_failed",
  "preflight_failed",
]);

export function errorStatus(e: CrewError): number {
  if (notFound.has(e.kind)) return 404;
  if (conflict.has(e.kind)) return 409;
  if (unprocessable.has(e.kind)) return 422;
  if (e.kind === "lock_failed") return 423;
  return 500;
}

export function errorResponse(c: Context, e: CrewError) {
  const status = errorStatus(e);
  return c.json({ error: { kind: e.kind, message: renderError(e) } }, status as Parameters<typeof c.json>[1]);
}
