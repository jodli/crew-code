import { describe, expect, test } from "bun:test";

describe("CLI agent spawn command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./spawn.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("defines name as optional string flag", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("string");
    expect(cmd.args?.name?.required).toBe(false);
  });

  test("defines prompt as optional string flag", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.prompt).toBeDefined();
    expect(cmd.args?.prompt?.type).toBe("string");
    expect(cmd.args?.prompt?.required).toBe(false);
  });

  test("defines model as optional string flag", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.model).toBeDefined();
    expect(cmd.args?.model?.type).toBe("string");
    expect(cmd.args?.model?.required).toBe(false);
  });

  test("defines color as optional string flag", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.color).toBeDefined();
    expect(cmd.args?.color?.type).toBe("string");
    expect(cmd.args?.color?.required).toBe(false);
  });

  test("defines agent-type as optional string flag", async () => {
    const mod = await import("./spawn.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.["agent-type"]).toBeDefined();
    expect(cmd.args?.["agent-type"]?.type).toBe("string");
    expect(cmd.args?.["agent-type"]?.required).toBe(false);
  });
});
