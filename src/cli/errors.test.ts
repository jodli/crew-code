import { describe, expect, test } from "bun:test";
import type { CrewError } from "../types/errors.ts";
import { renderError } from "./errors.ts";

describe("renderError", () => {
  test("renders known error kinds with context", () => {
    const result = renderError({ kind: "team_not_found", team: "alpha" });
    expect(result).toContain("alpha");
    expect(result).toContain("not found");
  });

  test("falls back to [kind] for unknown error kinds", () => {
    const result = renderError({ kind: "some_future_error" } as unknown as CrewError);
    expect(result).toBe("[some_future_error]");
  });

  test("includes extra fields in fallback", () => {
    const result = renderError({ kind: "some_future_error", detail: "boom" } as unknown as CrewError);
    expect(result).toContain("[some_future_error]");
    expect(result).toContain("boom");
  });

  test("renders invalid_name with label", () => {
    const result = renderError({ kind: "invalid_name", name: "../evil", label: "team" });
    expect(result).toContain("team");
    expect(result).toContain("../evil");
  });
});
