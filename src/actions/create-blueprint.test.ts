import { describe, expect, test } from "bun:test";
import { createBlueprint } from "./create-blueprint.ts";

describe("actions/create-blueprint", () => {
  test("re-exports createBlueprint from core", () => {
    expect(typeof createBlueprint).toBe("function");
  });
});
