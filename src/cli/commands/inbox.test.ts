import { describe, expect, test } from "bun:test";

describe("CLI inbox command", () => {
  test.skip("--help shows inbox command help", () => {});

  test("inbox command module exports a citty command definition", async () => {
    const mod = await import("./inbox.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("inbox command defines team and agent as required positional args", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBe(true);
    expect(cmd.args?.agent).toBeDefined();
    expect(cmd.args?.agent?.required).toBe(true);
  });

  test("inbox command defines --unread and --full as optional boolean flags", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.unread).toBeDefined();
    expect(cmd.args?.unread?.type).toBe("boolean");
    expect(cmd.args?.unread?.required).toBeFalsy();
    expect(cmd.args?.full).toBeDefined();
    expect(cmd.args?.full?.type).toBe("boolean");
    expect(cmd.args?.full?.required).toBeFalsy();
  });
});
