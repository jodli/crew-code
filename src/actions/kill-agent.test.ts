import { describe, expect, test, mock } from "bun:test";
import { killAgent } from "./kill-agent.ts";

describe("actions/kill-agent", () => {
  test("does nothing when processId is empty", () => {
    // Should not throw
    killAgent("");
  });

  test("does nothing when processId is not a valid number", () => {
    killAgent("abc");
  });

  test("does nothing when processId is 0", () => {
    killAgent("0");
  });
});
