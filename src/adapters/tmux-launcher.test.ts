import { describe, expect, test } from "bun:test";
import { TmuxLauncher, type TmuxLauncherDeps } from "./tmux-launcher.ts";
import type { TmuxResult } from "../lib/tmux.ts";

function makeDeps(
  overrides: Partial<TmuxLauncherDeps> = {},
): TmuxLauncherDeps {
  return {
    execTmux: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    whichSync: () => "/usr/bin/placeholder",
    ...overrides,
  };
}

describe("TmuxLauncher", () => {
  describe("preflight()", () => {
    test("succeeds when tmux installed, server running, claude installed", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          whichSync: (cmd) =>
            cmd === "tmux" ? "/usr/bin/tmux" : "/usr/bin/claude",
          execTmux: async () => ({
            stdout: "0: 1 windows",
            stderr: "",
            exitCode: 0,
          }),
        }),
      );

      const result = await launcher.preflight();
      expect(result.ok).toBe(true);
    });

    test("returns tmux_not_installed when tmux is missing", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          whichSync: (cmd) => (cmd === "tmux" ? null : "/usr/bin/claude"),
        }),
      );

      const result = await launcher.preflight();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("tmux_not_installed");
      }
    });

    test("returns tmux_server_not_running when server is down", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "",
            stderr: "no server running",
            exitCode: 1,
          }),
        }),
      );

      const result = await launcher.preflight();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("tmux_server_not_running");
      }
    });

    test("returns claude_not_installed when claude is missing", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          whichSync: (cmd) => (cmd === "tmux" ? "/usr/bin/tmux" : null),
          execTmux: async () => ({
            stdout: "0: 1 windows",
            stderr: "",
            exitCode: 0,
          }),
        }),
      );

      const result = await launcher.preflight();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("claude_not_installed");
      }
    });
  });

  describe("launch()", () => {
    test("creates tmux pane with correct env var and required flags", async () => {
      let capturedArgs: string[] = [];
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async (args) => {
            capturedArgs = args;
            return { stdout: "%5", stderr: "", exitCode: 0 };
          },
        }),
      );

      const result = await launcher.launch({
        agentId: "scout@my-team",
        agentName: "scout",
        teamName: "my-team",
        cwd: "/home/user/repos",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("%5");
      }

      // Check the command passed to tmux
      const cmd = capturedArgs[capturedArgs.length - 1];
      expect(cmd).toContain("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1");
      expect(cmd).toContain("--agent-id scout@my-team");
      expect(cmd).toContain("--agent-name scout");
      expect(cmd).toContain("--team-name my-team");
    });

    test("passes optional flags when provided", async () => {
      let capturedCmd = "";
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async (args) => {
            capturedCmd = args[args.length - 1];
            return { stdout: "%5", stderr: "", exitCode: 0 };
          },
        }),
      );

      await launcher.launch({
        agentId: "scout@my-team",
        agentName: "scout",
        teamName: "my-team",
        cwd: "/home/user/repos",
        color: "blue",
        parentSessionId: "abc-123",
        model: "claude-opus-4-6",
      });

      expect(capturedCmd).toContain("--agent-color blue");
      expect(capturedCmd).toContain("--parent-session-id abc-123");
      expect(capturedCmd).toContain("--model claude-opus-4-6");
    });

    test("returns pane ID on success", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({ stdout: "%42\n", stderr: "", exitCode: 0 }),
        }),
      );

      const result = await launcher.launch({
        agentId: "a@t",
        agentName: "a",
        teamName: "t",
        cwd: "/tmp",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("%42");
      }
    });

    test("returns error if tmux split-window fails", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "",
            stderr: "no space",
            exitCode: 1,
          }),
        }),
      );

      const result = await launcher.launch({
        agentId: "a@t",
        agentName: "a",
        teamName: "t",
        cwd: "/tmp",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("launch_failed");
      }
    });
  });

  describe("kill()", () => {
    test("kills the tmux pane", async () => {
      let capturedArgs: string[] = [];
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async (args) => {
            capturedArgs = args;
            return { stdout: "", stderr: "", exitCode: 0 };
          },
        }),
      );

      const result = await launcher.kill("%5");
      expect(result.ok).toBe(true);
      expect(capturedArgs).toContain("kill-pane");
      expect(capturedArgs).toContain("%5");
    });

    test("handles already-dead pane gracefully", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "",
            stderr: "can't find pane",
            exitCode: 1,
          }),
        }),
      );

      // Should still return ok — pane is already gone, that's fine
      const result = await launcher.kill("%99");
      expect(result.ok).toBe(true);
    });
  });

  describe("isAlive()", () => {
    test("returns true when pane exists", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "%0\n%1\n%5",
            stderr: "",
            exitCode: 0,
          }),
        }),
      );

      expect(await launcher.isAlive("%1")).toBe(true);
    });

    test("returns false when pane does not exist", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "%0\n%1",
            stderr: "",
            exitCode: 0,
          }),
        }),
      );

      expect(await launcher.isAlive("%99")).toBe(false);
    });

    test("returns false when tmux command fails", async () => {
      const launcher = new TmuxLauncher(
        makeDeps({
          execTmux: async () => ({
            stdout: "",
            stderr: "error",
            exitCode: 1,
          }),
        }),
      );

      expect(await launcher.isAlive("%0")).toBe(false);
    });
  });
});
