import { describe, expect, test } from "bun:test";
import type { CrewError } from "./errors.ts";
import { err, ok, type Result } from "./result.ts";

describe("Result helpers", () => {
  test("ok(value) returns { ok: true, value }", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test("err(error) returns { ok: false, error }", () => {
    const error: CrewError = { kind: "spawn_failed", detail: "something broke" };
    const result = err(error);
    expect(result).toEqual({ ok: false, error });
  });

  test("type narrowing works after checking .ok", () => {
    const success: Result<number> = ok(10);
    const failure: Result<number> = err({ kind: "spawn_failed", detail: "fail" });

    if (success.ok) {
      expect(success.value).toBe(10);
    } else {
      throw new Error("expected ok");
    }

    if (!failure.ok) {
      expect(failure.error.kind).toBe("spawn_failed");
    } else {
      throw new Error("expected err");
    }
  });
});
