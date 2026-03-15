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
      task: "Implement auth",
      model: "opus",
    })).toEqual([
      "crew", "spawn", "--team", "my-team",
      "--name", "coder",
      "--task", "Implement auth",
      "--model", "opus",
    ]);
  });

  test("skips empty strings", () => {
    expect(buildSpawnCommand("t", { name: "", task: "do stuff", model: "" })).toEqual([
      "crew", "spawn", "--team", "t",
      "--task", "do stuff",
    ]);
  });
});

describe("buildCreateCommand", () => {
  test("builds create command", () => {
    expect(buildCreateCommand("alpha")).toEqual(["crew", "create", "--name", "alpha"]);
  });
});

describe("buildAttachCommand", () => {
  test("builds attach command", () => {
    expect(buildAttachCommand("alpha", "coder")).toEqual([
      "crew", "attach", "--team", "alpha", "--name", "coder",
    ]);
  });
});
