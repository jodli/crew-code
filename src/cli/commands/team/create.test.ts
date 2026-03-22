import { describe, expect, test } from "bun:test";

describe("CLI team create command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./create.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines name as positional required arg", async () => {
    const mod = await import("./create.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("positional");
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("defines description as optional string flag", async () => {
    const mod = await import("./create.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.description).toBeDefined();
    expect(cmd.args?.description?.type).toBe("string");
    expect(cmd.args?.description?.required).toBe(false);
  });
});
