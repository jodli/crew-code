import { describe, expect, test } from "bun:test";

describe("CLI team update command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./update.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines name as positional required arg", async () => {
    const mod = await import("./update.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("positional");
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("defines description as optional string flag with alias d", async () => {
    const mod = await import("./update.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean; alias?: string }>;
    };
    expect(cmd.args?.description).toBeDefined();
    expect(cmd.args?.description?.type).toBe("string");
    expect(cmd.args?.description?.required).toBe(false);
    expect(cmd.args?.description?.alias).toBe("d");
  });
});
