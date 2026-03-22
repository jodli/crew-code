import { describe, expect, test } from "bun:test";

describe("CLI team messages command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./messages.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("defines unread as optional boolean flag", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.unread).toBeDefined();
    expect(cmd.args?.unread?.type).toBe("boolean");
    expect(cmd.args?.unread?.required).toBe(false);
  });

  test("defines full as optional boolean flag", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.full).toBeDefined();
    expect(cmd.args?.full?.type).toBe("boolean");
    expect(cmd.args?.full?.required).toBe(false);
  });

  test("defines watch as optional boolean flag", async () => {
    const mod = await import("./messages.ts");
    const cmd = mod.default as {
      args?: Record<string, { type?: string; required?: boolean }>;
    };
    expect(cmd.args?.watch).toBeDefined();
    expect(cmd.args?.watch?.type).toBe("boolean");
    expect(cmd.args?.watch?.required).toBe(false);
  });
});
