import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";

const NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function validateName(name: string, label: string): Result<void> {
  if (!NAME_PATTERN.test(name)) {
    return err({ kind: "invalid_name" as const, name, label });
  }
  return ok(undefined);
}
