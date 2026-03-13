import { describe, expect, test } from "bun:test";

describe("CLI doctor command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts doctor --help
  test.skip("--help shows doctor command help", () => {});

  test("doctor command module exports a citty command definition", async () => {
    const mod = await import("./doctor.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("doctor command defines --team as optional arg", async () => {
    const mod = await import("./doctor.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBeFalsy();
  });

  test("doctor command defines --fix as optional boolean arg", async () => {
    const mod = await import("./doctor.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean; type?: string }>;
    };
    expect(cmd.args?.fix).toBeDefined();
    expect(cmd.args?.fix?.type).toBe("boolean");
    expect(cmd.args?.fix?.required).toBeFalsy();
  });
});
