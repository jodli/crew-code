import { describe, expect, test } from "bun:test";

describe("CLI spawn command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts spawn --help
  test.skip("--help shows spawn command help with required flags", () => {
    // Will be enabled once the Bun test runner bug is fixed.
  });

  test("spawn command module exports a citty command definition", async () => {
    const mod = await import("./spawn.ts");
    expect(mod.default).toBeDefined();
    // citty commands have a meta property after resolution
    expect(typeof mod.default).toBe("object");
  });

  test("defines --team as a required string arg", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default;
    expect(cmd.args).toBeDefined();
    const args = cmd.args as Record<string, { type: string; required?: boolean }>;
    expect(args.team).toBeDefined();
    expect(args.team.type).toBe("string");
    expect(args.team.required).toBe(true);
  });
});
