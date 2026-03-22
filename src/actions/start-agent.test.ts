import { describe, expect, test } from "bun:test";
import { startAgent } from "./start-agent.ts";

describe("actions/start-agent", () => {
  test("re-exports startAgent from core", () => {
    expect(typeof startAgent).toBe("function");
  });
});
