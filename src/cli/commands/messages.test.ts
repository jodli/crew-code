import { describe, expect, test } from "bun:test";

describe("CLI messages command", () => {
  test("messages command module exports a citty command definition", async () => {
    const mod = await import("./messages.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("messages command defines --team as required arg", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("messages command defines --unread, --full, --watch as optional boolean flags", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.unread).toBeDefined();
    expect(cmd.args?.unread?.type).toBe("boolean");
    expect(cmd.args?.unread?.required).toBeFalsy();
    expect(cmd.args?.full).toBeDefined();
    expect(cmd.args?.full?.type).toBe("boolean");
    expect(cmd.args?.full?.required).toBeFalsy();
    expect(cmd.args?.watch).toBeDefined();
    expect(cmd.args?.watch?.type).toBe("boolean");
    expect(cmd.args?.watch?.required).toBeFalsy();
  });
});
