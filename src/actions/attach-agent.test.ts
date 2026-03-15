import { describe, expect, test } from "bun:test";
import { attachAgent } from "./attach-agent.ts";

describe("actions/attach-agent", () => {
  test("re-exports attachAgent from core", () => {
    expect(typeof attachAgent).toBe("function");
  });
});
