import { describe, expect, test } from "bun:test";
import {
  addPaneToTeamSession,
  isTmuxAvailable,
  type TmuxDeps,
  teamSessionExists,
  teamSessionName,
} from "./tmux-session.ts";

describe("teamSessionName", () => {
  test("returns crew_ prefixed name", () => {
    expect(teamSessionName("alpha")).toBe("crew_alpha");
  });

  test("handles hyphens in team name", () => {
    expect(teamSessionName("my-team")).toBe("crew_my-team");
  });
});

function mockDeps(overrides: Partial<TmuxDeps> = {}): TmuxDeps {
  const calls: Array<{ cmd: string[]; opts?: Record<string, unknown> }> = [];
  return {
    spawnSync: ((cmd: string[], opts?: Record<string, unknown>) => {
      calls.push({ cmd, opts });
      return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
    }) as unknown as TmuxDeps["spawnSync"],
    get calls() {
      return calls;
    },
    ...overrides,
  };
}

describe("isTmuxAvailable", () => {
  test("returns true when tmux is on PATH", () => {
    const deps = mockDeps({
      spawnSync: (() => ({ exitCode: 0 })) as unknown as TmuxDeps["spawnSync"],
    });
    expect(isTmuxAvailable(deps)).toBe(true);
  });

  test("returns false when tmux is not found", () => {
    const deps = mockDeps({
      spawnSync: (() => ({ exitCode: 1 })) as unknown as TmuxDeps["spawnSync"],
    });
    expect(isTmuxAvailable(deps)).toBe(false);
  });
});

describe("teamSessionExists", () => {
  test("returns true when session exists", () => {
    const deps = mockDeps({
      spawnSync: (() => ({ exitCode: 0 })) as unknown as TmuxDeps["spawnSync"],
    });
    expect(teamSessionExists("alpha", deps)).toBe(true);
  });

  test("returns false when session does not exist", () => {
    const deps = mockDeps({
      spawnSync: (() => ({ exitCode: 1 })) as unknown as TmuxDeps["spawnSync"],
    });
    expect(teamSessionExists("alpha", deps)).toBe(false);
  });
});

describe("addPaneToTeamSession", () => {
  test("creates new session when none exists", () => {
    const calls: Array<{ cmd: string[] }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[], opts?: Record<string, unknown>) => {
        calls.push({ cmd, ...opts });
        // has-session → not found; new-session → ok; list-panes → PID
        if (cmd.includes("has-session")) return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("list-panes")) return { exitCode: 0, stdout: Buffer.from("12345\n"), stderr: Buffer.from("") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    const result = addPaneToTeamSession(
      { teamName: "alpha", agentName: "scout", command: ["claude", "--arg"], cwd: "/tmp" },
      deps,
    );

    expect(result.pid).toBe(12345);
    expect(result.sessionName).toBe("crew_alpha");
    expect(result.isNewSession).toBe(true);

    const newSessionCall = calls.find((c) => c.cmd.includes("new-session"));
    expect(newSessionCall).toBeDefined();
    expect(newSessionCall!.cmd).toContain("-s");
    expect(newSessionCall!.cmd).toContain("crew_alpha");
  });

  test("splits window when session exists — defaults to tiled", () => {
    const calls: Array<{ cmd: string[] }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[], opts?: Record<string, unknown>) => {
        calls.push({ cmd, ...opts });
        if (cmd.includes("has-session")) return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("split-window")) return { exitCode: 0, stdout: Buffer.from("%7\n"), stderr: Buffer.from("") };
        if (cmd.includes("list-panes"))
          return { exitCode: 0, stdout: Buffer.from("%7 54321\n"), stderr: Buffer.from("") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    const result = addPaneToTeamSession(
      { teamName: "alpha", agentName: "coder", command: ["claude"], cwd: "/tmp" },
      deps,
    );

    expect(result.pid).toBe(54321);
    expect(result.isNewSession).toBe(false);

    const layoutCall = calls.find((c) => c.cmd.includes("select-layout"));
    expect(layoutCall).toBeDefined();
    expect(layoutCall!.cmd).toContain("tiled");

    const titleCall = calls.find((c) => c.cmd.includes("select-pane") && c.cmd.includes("-T"));
    expect(titleCall).toBeDefined();
    expect(titleCall!.cmd).toContain("coder");
  });

  test("main-vertical layout: selects first pane by default so team-lead stays on the left", () => {
    const calls: Array<{ cmd: string[] }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[], opts?: Record<string, unknown>) => {
        calls.push({ cmd, ...opts });
        if (cmd.includes("has-session")) return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("split-window")) return { exitCode: 0, stdout: Buffer.from("%7\n"), stderr: Buffer.from("") };
        if (cmd.includes("list-panes")) {
          const fIdx = cmd.indexOf("-F");
          const fmt = fIdx >= 0 ? cmd[fIdx + 1] : "";
          if (fmt.includes("pane_pid")) return { exitCode: 0, stdout: Buffer.from("%7 54321\n"), stderr: Buffer.from("") };
          // getFirstPaneId: "#{pane_id}"
          return { exitCode: 0, stdout: Buffer.from("%1\n"), stderr: Buffer.from("") };
        }
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    const result = addPaneToTeamSession(
      { teamName: "alpha", agentName: "coder", command: ["claude"], cwd: "/tmp", layout: "main-vertical" },
      deps,
    );

    expect(result.pid).toBe(54321);

    const layoutCall = calls.find((c) => c.cmd.includes("select-layout"));
    expect(layoutCall!.cmd).toContain("main-vertical");

    // First pane selected before layout so it becomes the main left pane
    const mainSelect = calls.find((c) => c.cmd.includes("select-pane") && c.cmd.includes("%1") && !c.cmd.includes("-T"));
    expect(mainSelect).toBeDefined();
  });

  test("main-vertical layout: selects named mainPane when specified", () => {
    const calls: Array<{ cmd: string[] }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[], opts?: Record<string, unknown>) => {
        calls.push({ cmd, ...opts });
        if (cmd.includes("has-session")) return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("split-window")) return { exitCode: 0, stdout: Buffer.from("%7\n"), stderr: Buffer.from("") };
        if (cmd.includes("list-panes")) {
          const fIdx = cmd.indexOf("-F");
          const fmt = fIdx >= 0 ? cmd[fIdx + 1] : "";
          if (fmt.includes("pane_pid")) return { exitCode: 0, stdout: Buffer.from("%7 54321\n"), stderr: Buffer.from("") };
          if (fmt.includes("pane_title")) return { exitCode: 0, stdout: Buffer.from("%2 lead\n%7 coder\n"), stderr: Buffer.from("") };
          // getFirstPaneId fallback
          return { exitCode: 0, stdout: Buffer.from("%2\n"), stderr: Buffer.from("") };
        }
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    addPaneToTeamSession(
      { teamName: "alpha", agentName: "coder", command: ["claude"], cwd: "/tmp", layout: "main-vertical", mainPane: "lead" },
      deps,
    );

    // Should have selected %2 (the "lead" pane) — not the first pane
    const mainSelect = calls.find((c) => c.cmd.includes("select-pane") && c.cmd.includes("%2") && !c.cmd.includes("-T"));
    expect(mainSelect).toBeDefined();
  });

  test("retries with split-window on race condition (new-session fails because session appeared)", () => {
    let newSessionAttempts = 0;
    const deps = mockDeps({
      spawnSync: ((cmd: string[]) => {
        if (cmd.includes("has-session")) return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("new-session")) {
          newSessionAttempts++;
          // Simulate race: session was created by another process
          return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("duplicate session: crew_alpha") };
        }
        if (cmd.includes("split-window")) return { exitCode: 0, stdout: Buffer.from("%3\n"), stderr: Buffer.from("") };
        if (cmd.includes("list-panes"))
          return { exitCode: 0, stdout: Buffer.from("%3 99999\n"), stderr: Buffer.from("") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    const result = addPaneToTeamSession(
      { teamName: "alpha", agentName: "scout", command: ["claude"], cwd: "/tmp" },
      deps,
    );

    expect(newSessionAttempts).toBe(1);
    expect(result.pid).toBe(99999);
    expect(result.isNewSession).toBe(false);
  });

  test("throws when tmux commands fail", () => {
    const deps = mockDeps({
      spawnSync: ((cmd: string[]) => {
        if (cmd.includes("has-session")) return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("new-session"))
          return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("server not found") };
        if (cmd.includes("split-window"))
          return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("server not found") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    expect(() =>
      addPaneToTeamSession({ teamName: "alpha", agentName: "scout", command: ["claude"], cwd: "/tmp" }, deps),
    ).toThrow();
  });

  test("sets pane title for new session too", () => {
    const calls: Array<{ cmd: string[] }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[]) => {
        calls.push({ cmd });
        if (cmd.includes("has-session")) return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("list-panes")) return { exitCode: 0, stdout: Buffer.from("11111\n"), stderr: Buffer.from("") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    addPaneToTeamSession({ teamName: "alpha", agentName: "lead", command: ["claude"], cwd: "/tmp" }, deps);

    const titleCall = calls.find((c) => c.cmd.includes("select-pane") && c.cmd.includes("-T"));
    expect(titleCall).toBeDefined();
    expect(titleCall!.cmd).toContain("lead");
  });

  test("passes cwd to tmux commands", () => {
    const calls: Array<{ cmd: string[]; cwd?: string }> = [];
    const deps = mockDeps({
      spawnSync: ((cmd: string[], opts?: { cwd?: string }) => {
        calls.push({ cmd, cwd: opts?.cwd });
        if (cmd.includes("has-session")) return { exitCode: 1, stdout: Buffer.from(""), stderr: Buffer.from("") };
        if (cmd.includes("list-panes")) return { exitCode: 0, stdout: Buffer.from("11111\n"), stderr: Buffer.from("") };
        return { exitCode: 0, stdout: Buffer.from(""), stderr: Buffer.from("") };
      }) as unknown as TmuxDeps["spawnSync"],
    });

    addPaneToTeamSession(
      { teamName: "alpha", agentName: "scout", command: ["claude"], cwd: "/home/user/project" },
      deps,
    );

    const newSessionCall = calls.find((c) => c.cmd.includes("new-session"));
    expect(newSessionCall!.cmd).toContain("-c");
    expect(newSessionCall!.cmd).toContain("/home/user/project");
  });
});
