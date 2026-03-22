import { describe, expect, test } from "bun:test";

describe("CLI team list command", () => {
  test("exports a citty command definition", async () => {
    const mod = await import("./list.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("has no required args", async () => {
    const mod = await import("./list.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    if (cmd.args) {
      for (const [, arg] of Object.entries(cmd.args)) {
        expect(arg.required).not.toBe(true);
      }
    }
  });
});
