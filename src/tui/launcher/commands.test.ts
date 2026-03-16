import { describe, expect, test } from "bun:test";
import { buildSpawnCommand, buildCreateCommand, buildAttachCommand } from "./commands.ts";

describe("buildSpawnCommand", () => {
  test("minimal: team only", () => {
    expect(buildSpawnCommand("my-team", {})).toEqual([
      "crew", "spawn", "--team", "my-team",
    ]);
  });

  test("with all options", () => {
    expect(buildSpawnCommand("my-team", {
      name: "coder",
      systemPrompt: "Implement auth",
      model: "opus",
    })).toEqual([
      "crew", "spawn", "--team", "my-team",
      "--name", "coder",
      "--system-prompt", "Implement auth",
      "--model", "opus",
    ]);
  });

  test("skips empty strings", () => {
    expect(buildSpawnCommand("t", { name: "", systemPrompt: "do stuff", model: "" })).toEqual([
      "crew", "spawn", "--team", "t",
      "--system-prompt", "do stuff",
    ]);
  });

  test("appends -- and extra args when provided", () => {
    expect(buildSpawnCommand("my-team", { name: "coder", extraArgs: ["--verbose"] })).toEqual([
      "crew", "spawn", "--team", "my-team",
      "--name", "coder",
      "--", "--verbose",
    ]);
  });

  test("omits -- when extraArgs is empty", () => {
    expect(buildSpawnCommand("my-team", { extraArgs: [] })).toEqual([
      "crew", "spawn", "--team", "my-team",
    ]);
  });
});

describe("buildCreateCommand", () => {
  test("builds create command", () => {
    expect(buildCreateCommand("alpha")).toEqual(["crew", "create", "--name", "alpha"]);
  });

  test("appends -- and extra args when provided", () => {
    expect(buildCreateCommand("alpha", ["--verbose", "--effort", "high"])).toEqual([
      "crew", "create", "--name", "alpha",
      "--", "--verbose", "--effort", "high",
    ]);
  });

  test("omits -- when extra args is empty", () => {
    expect(buildCreateCommand("alpha", [])).toEqual(["crew", "create", "--name", "alpha"]);
  });
});

describe("buildAttachCommand", () => {
  test("builds attach command", () => {
    expect(buildAttachCommand("alpha", "coder")).toEqual([
      "crew", "attach", "--team", "alpha", "--name", "coder",
    ]);
  });

  test("appends -- and extra args when provided", () => {
    expect(buildAttachCommand("alpha", "coder", ["--verbose"])).toEqual([
      "crew", "attach", "--team", "alpha", "--name", "coder",
      "--", "--verbose",
    ]);
  });

  test("omits -- when extra args is empty", () => {
    expect(buildAttachCommand("alpha", "coder", [])).toEqual([
      "crew", "attach", "--team", "alpha", "--name", "coder",
    ]);
  });
});
