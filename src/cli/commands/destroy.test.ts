import { describe, expect, test } from "bun:test";

describe("CLI destroy command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts destroy --help
  test.skip("--help shows destroy command help", () => {});

  test("destroy command module exports a citty command definition", async () => {
    const mod = await import("./destroy.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("destroy command defines --team as required arg", async () => {
    const mod = await import("./destroy.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("destroy command defines --force as optional boolean arg", async () => {
    const mod = await import("./destroy.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean; type?: string }>;
    };
    expect(cmd.args?.force).toBeDefined();
    expect(cmd.args?.force?.required).toBeFalsy();
    expect(cmd.args?.force?.type).toBe("boolean");
  });
});
