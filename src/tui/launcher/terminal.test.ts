import { describe, expect, test } from "bun:test";
import { buildTerminalCommand, type TerminalEmulator } from "./terminal.ts";

describe("buildTerminalCommand", () => {
  const command = ["crew", "create", "--name", "my-team"];
  const cwd = "/home/user/project";

  test("ghostty uses --working-directory= and -e", () => {
    const result = buildTerminalCommand("ghostty", command, cwd);
    expect(result[0]).toBe("ghostty");
    expect(result[1]).toBe("--working-directory=/home/user/project");
    expect(result[2]).toBe("-e");
    expect(result.slice(3)).toEqual(command);
  });

  test("alacritty uses --working-directory and -e", () => {
    const result = buildTerminalCommand("alacritty", command, cwd);
    expect(result[0]).toBe("alacritty");
    expect(result[1]).toBe("--working-directory");
    expect(result[2]).toBe(cwd);
    expect(result[3]).toBe("-e");
    expect(result.slice(4)).toEqual(command);
  });

  test("xdg-terminal-exec wraps with cd + exec", () => {
    const result = buildTerminalCommand("xdg-terminal-exec", command, cwd);
    expect(result[0]).toBe("xdg-terminal-exec");
    expect(result[1]).toBe("sh");
    expect(result[2]).toBe("-c");
    expect(result[3]).toContain("cd '/home/user/project'");
    expect(result[3]).toContain("exec 'crew' 'create' '--name' 'my-team'");
  });

  test("handles paths with spaces", () => {
    const cwdWithSpaces = "/home/user/my project";
    const result = buildTerminalCommand("ghostty", command, cwdWithSpaces);
    expect(result[1]).toBe("--working-directory=/home/user/my project");
  });

  test("xdg-terminal-exec escapes single quotes in path", () => {
    const cwdWithQuotes = "/home/user/it's a project";
    const result = buildTerminalCommand("xdg-terminal-exec", command, cwdWithQuotes);
    expect(result[3]).toContain("cd '/home/user/it'\\''s a project'");
  });
});
