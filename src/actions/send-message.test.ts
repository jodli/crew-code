import { describe, expect, test } from "bun:test";
import { sendMessage } from "./send-message.ts";

describe("actions/send-message", () => {
  test("re-exports sendMessage from core", () => {
    expect(typeof sendMessage).toBe("function");
  });
});
