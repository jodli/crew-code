import { describe, test } from "bun:test";

describe("CLI entry point", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts --help
  test.skip("--help exits with code 0 and shows expected output", () => {
    // Will be enabled once the Bun test runner bug is fixed.
  });
});
