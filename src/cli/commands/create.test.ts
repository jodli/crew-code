import { describe, expect, test } from "bun:test";

describe("CLI create command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts create --help
  test.skip("--help shows create command help with required flags", () => {
    // Will be enabled once the Bun test runner bug is fixed.
  });

  test("create command module exports a citty command definition", async () => {
    const mod = await import("./create.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("create command defines --name as required arg", async () => {
    const mod = await import("./create.ts");
    const cmd = mod.default as { args?: Record<string, { required?: boolean }> };
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("create command defines --description as optional arg", async () => {
    const mod = await import("./create.ts");
    const cmd = mod.default as { args?: Record<string, { required?: boolean }> };
    expect(cmd.args?.description).toBeDefined();
    expect(cmd.args?.description?.required).toBeFalsy();
  });
});
