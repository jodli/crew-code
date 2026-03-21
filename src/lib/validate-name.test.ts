import { describe, expect, test } from "bun:test";
import { validateName } from "./validate-name.ts";

describe("validateName", () => {
  test("accepts valid names", () => {
    expect(validateName("my-team", "team").ok).toBe(true);
    expect(validateName("agent_1", "agent").ok).toBe(true);
    expect(validateName("CamelCase", "team").ok).toBe(true);
    expect(validateName("a", "team").ok).toBe(true);
    expect(validateName("a".repeat(64), "team").ok).toBe(true);
  });

  test("rejects path traversal", () => {
    expect(validateName("../etc", "team").ok).toBe(false);
    expect(validateName("foo/bar", "team").ok).toBe(false);
    expect(validateName("foo\\bar", "team").ok).toBe(false);
  });

  test("rejects empty and too-long names", () => {
    expect(validateName("", "team").ok).toBe(false);
    expect(validateName("a".repeat(65), "team").ok).toBe(false);
  });

  test("rejects special characters", () => {
    expect(validateName("my team", "team").ok).toBe(false);
    expect(validateName("my.team", "team").ok).toBe(false);
    expect(validateName("my@team", "team").ok).toBe(false);
  });

  test("error includes name and label", () => {
    const result = validateName("../evil", "team");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "invalid_name",
        name: "../evil",
        label: "team",
      });
    }
  });
});
