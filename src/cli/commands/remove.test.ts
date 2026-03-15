import { describe, expect, test } from "bun:test";

describe("CLI remove command", () => {
  test("remove command module exports a citty command definition", async () => {
    const mod = await import("./remove.ts");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object");
  });

  test("remove command defines --team as required arg", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.team).toBeDefined();
    expect(cmd.args?.team?.required).toBe(true);
  });

  test("remove command defines --name as required arg", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean }>;
    };
    expect(cmd.args?.name).toBeDefined();
    expect(cmd.args?.name?.required).toBe(true);
  });

  test("remove command defines --force as optional boolean arg", async () => {
    const mod = await import("./remove.ts");
    const cmd = mod.default as {
      args?: Record<string, { required?: boolean; type?: string }>;
    };
    expect(cmd.args?.force).toBeDefined();
    expect(cmd.args?.force?.type).toBe("boolean");
    expect(cmd.args?.force?.required).toBeFalsy();
  });
});
