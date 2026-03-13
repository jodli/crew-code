import { describe, expect, test } from "bun:test";
import { ok, err, type Result } from "./result.ts";

describe("Result helpers", () => {
  test("ok(value) returns { ok: true, value }", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test("err(error) returns { ok: false, error }", () => {
    const error = { kind: "test-error", detail: "something broke" };
    const result = err(error);
    expect(result).toEqual({ ok: false, error });
  });

  test("type narrowing works after checking .ok", () => {
    const success: Result<number> = ok(10);
    const failure: Result<number> = err({ kind: "fail" });

    if (success.ok) {
      // TS narrows to { ok: true, value: number }
      expect(success.value).toBe(10);
    } else {
      throw new Error("expected ok");
    }

    if (!failure.ok) {
      // TS narrows to { ok: false, error: CrewError }
      expect(failure.error.kind).toBe("fail");
    } else {
      throw new Error("expected err");
    }
  });
});
