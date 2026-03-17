import { describe, expect, test } from "bun:test";
import { listBlueprints } from "./list-blueprints.ts";

describe("actions/list-blueprints", () => {
  test("re-exports listBlueprints from core", () => {
    expect(typeof listBlueprints).toBe("function");
  });
});
