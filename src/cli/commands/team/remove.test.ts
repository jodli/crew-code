import { describe, expect, test } from "bun:test";

describe("CLI team remove command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./remove.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines name as positional required arg", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("positional");
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("defines force as optional boolean flag", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.force).toBeDefined();
    expect(cmd.args?.force?.type).toBe("boolean");
    expect(cmd.args?.force?.required).toBe(false);
  });
});
