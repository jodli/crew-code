import { describe, expect, test } from "bun:test";

describe("CLI agent remove command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./remove.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("defines name as required string flag", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("string");
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("defines force as optional boolean flag", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.force).toBeDefined();
    expect(cmd.args?.force?.type).toBe("boolean");
    expect(cmd.args?.force?.required).toBe(false);
  });
});
