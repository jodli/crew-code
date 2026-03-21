import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { detectBackend } from "./detect.ts";

describe("detectBackend", () => {
  let originalTmux: string | undefined;

  beforeEach(() => {
    originalTmux = process.env.TMUX;
  });

  afterEach(() => {
    if (originalTmux !== undefined) {
      process.env.TMUX = originalTmux;
    } else {
      delete process.env.TMUX;
    }
  });

  test("returns 'tmux' when $TMUX is set", () => {
    process.env.TMUX = "/tmp/tmux-1000/default,12345,0";
    expect(detectBackend()).toBe("tmux");
  });

  test("returns 'terminal' when $TMUX is not set", () => {
    delete process.env.TMUX;
    expect(detectBackend()).toBe("terminal");
  });
});
