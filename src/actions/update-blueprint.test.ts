import { describe, expect, test } from "bun:test";
import { updateBlueprint } from "./update-blueprint.ts";

describe("actions/update-blueprint", () => {
  test("re-exports updateBlueprint from core", () => {
    expect(typeof updateBlueprint).toBe("function");
  });
});
