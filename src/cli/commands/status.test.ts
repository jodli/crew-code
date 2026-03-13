import { describe, expect, test } from "bun:test";

describe("CLI status command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts status --help
  test.skip("--help shows status command help", () => {});

  test("status command module exports a citty command definition", async () => {
    const mod = await import("./status.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("status command defines --team as optional arg", async () => {
    const mod = await import("./status.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBeFalsy();
  });
});
