import { describe, expect, test } from "bun:test";

describe("CLI agent list command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./list.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("defines team as positional required arg", async () => {
    const mod = await import("./list.ts");
    const cmd = mod.default as { args?: Record<string, { type?: string; required?: boolean }> };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.type).toBe("positional");
    expect(cmd.args?.team?.required).toBe(true);
  });
});
