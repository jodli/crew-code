import { describe, expect, test } from "bun:test";
import { buildAttachCommand, buildCreateCommand } from "./commands.ts";

// In test context, crewBin() returns ["bun", "run", "<test-script>"]
// We just verify the crew-specific args after the prefix
function stripPrefix(cmd: string[]): string[] {
  const crewIdx = cmd.findIndex((a) => a === "team" || a === "agent");
  return crewIdx >= 0 ? cmd.slice(crewIdx) : cmd;
}

describe("buildCreateCommand", () => {
  test("builds team create command with correct args", () => {
    const cmd = buildCreateCommand("alpha");
    expect(stripPrefix(cmd)).toEqual(["team", "create", "alpha"]);
  });

  test("appends -- and extra args when provided", () => {
    const cmd = buildCreateCommand("alpha", ["--verbose", "--effort", "high"]);
    expect(stripPrefix(cmd)).toEqual(["team", "create", "alpha", "--", "--verbose", "--effort", "high"]);
  });

  test("omits -- when extra args is empty", () => {
    const cmd = buildCreateCommand("alpha", []);
    expect(stripPrefix(cmd)).toEqual(["team", "create", "alpha"]);
  });
});

describe("buildAttachCommand", () => {
  test("builds agent attach command with correct args", () => {
    const cmd = buildAttachCommand("alpha", "coder");
    expect(stripPrefix(cmd)).toEqual(["agent", "attach", "alpha", "--name", "coder"]);
  });

  test("appends -- and extra args when provided", () => {
    const cmd = buildAttachCommand("alpha", "coder", ["--verbose"]);
    expect(stripPrefix(cmd)).toEqual(["agent", "attach", "alpha", "--name", "coder", "--", "--verbose"]);
  });

  test("omits -- when extra args is empty", () => {
    const cmd = buildAttachCommand("alpha", "coder", []);
    expect(stripPrefix(cmd)).toEqual(["agent", "attach", "alpha", "--name", "coder"]);
  });
});
