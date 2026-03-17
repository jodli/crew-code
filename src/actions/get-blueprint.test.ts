import { describe, expect, test } from "bun:test";
import { getBlueprint } from "./get-blueprint.ts";

describe("actions/get-blueprint", () => {
  test("re-exports getBlueprint from core", () => {
    expect(typeof getBlueprint).toBe("function");
  });
});
