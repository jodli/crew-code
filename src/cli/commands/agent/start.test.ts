import { describe, expect, test } from "bun:test";

describe("CLI agent start command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./start.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./start.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("defines name as optional string flag", async () => {
    const mod = await import("./start.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("string");
    expect(cmd.args?.name?.required).toBe(false);
  });

  test("defines headless as optional boolean flag", async () => {
    const mod = await import("./start.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean; default?: unknown }> };
    expect(cmd.args?.headless).toBeDefined();
    expect(cmd.args?.headless?.type).toBe("boolean");
    expect(cmd.args?.headless?.required).toBe(false);
    expect(cmd.args?.headless?.default).toBe(false);
  });
});
