import { describe, expect, test } from "bun:test";

describe("CLI send command", () => {
  // Skipped: Bun.spawn stdout pipe is broken inside bun test runner.
  // https://github.com/oven-sh/bun/issues/24690
  // Verify manually: bun run src/main.ts send --help
  test.skip("--help shows send command help", () => {});

  test("send command module exports a citty command definition", async () => {
    const mod = await import("./send.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("send command defines --team, --agent, --message as required args", async () => {
    const mod = await import("./send.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBe(true);
    expect(cmd.args?.agent).toBeDefined();
    expect(cmd.args?.agent?.required).toBe(true);
    expect(cmd.args?.message).toBeDefined();
    expect(cmd.args?.message?.required).toBe(true);
  });

  test("send command defines --from as optional arg", async () => {
    const mod = await import("./send.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.from).toBeDefined();
    expect(cmd.args?.from?.required).toBeFalsy();
  });
});
