import { describe, expect, test } from "bun:test";
import { isProcessAlive, killProcess } from "./process.ts";

describe("lib/process", () => {
  describe("isProcessAlive()", () => {
    test("returns true for the current process", () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });

    test("returns false for a non-existent PID", () => {
      // PID 99999999 is extremely unlikely to exist
      expect(isProcessAlive(99999999)).toBe(false);
    });

    test("returns false for NaN", () => {
      expect(isProcessAlive(NaN)).toBe(false);
    });

    test("returns false for negative PID", () => {
      expect(isProcessAlive(-1)).toBe(false);
    });
  });

  describe("killProcess()", () => {
    test("returns true when killing a real process", () => {
      // Spawn a long-running subprocess
      const proc = Bun.spawn(["sleep", "60"], { stdout: "ignore", stderr: "ignore" });
      const pid = proc.pid;

      expect(isProcessAlive(pid)).toBe(true);
      expect(killProcess(pid)).toBe(true);

      // Give it a moment to die
      proc.kill();
    });

    test("returns false for a non-existent PID", () => {
      expect(killProcess(99999999)).toBe(false);
    });

    test("returns false for NaN", () => {
      expect(killProcess(NaN)).toBe(false);
    });
  });
});
