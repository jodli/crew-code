import { describe, expect, test } from "bun:test";

describe("CLI agent inbox command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./inbox.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("defines name as required string flag", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.type).toBe("string");
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("defines unread as optional boolean flag", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.unread).toBeDefined();
    expect(cmd.args?.unread?.type).toBe("boolean");
    expect(cmd.args?.unread?.required).toBe(false);
  });

  test("defines full as optional boolean flag", async () => {
    const mod = await import("./inbox.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.full).toBeDefined();
    expect(cmd.args?.full?.type).toBe("boolean");
    expect(cmd.args?.full?.required).toBe(false);
  });
});
