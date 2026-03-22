import { describe, expect, test } from "bun:test";
import type { AgentLaunchInfo } from "../types/domain.ts";
import { type LaunchOptions, selectLaunchMode } from "./launch.ts";

const base: AgentLaunchInfo = {
  agentId: "scout@my-team",
  agentName: "scout",
  teamName: "my-team",
  cwd: "/home/user/repos",
  sessionId: "abc-def-123",
};

describe("runtime/selectLaunchMode", () => {
  test("returns 'new' when session file does not exist", () => {
    const mode = selectLaunchMode(base, () => false);
    expect(mode).toBe("new");
  });

  test("returns 'resume' when session file exists", () => {
    const mode = selectLaunchMode(base, () => true);
    expect(mode).toBe("resume");
  });

  test("returns 'new' when sessionId is undefined", () => {
    const mode = selectLaunchMode({ ...base, sessionId: undefined }, () => true);
    expect(mode).toBe("new");
  });

  test("passes cwd and sessionId to checkSession", () => {
    let calledWith: [string, string] | null = null;
    selectLaunchMode(base, (cwd, sessionId) => {
      calledWith = [cwd, sessionId];
      return false;
    });
    expect(calledWith![0]).toBe("/home/user/repos");
    expect(calledWith![1]).toBe("abc-def-123");
  });
});

describe("LaunchOptions", () => {
  test("headless option is typed correctly", () => {
    const opts: LaunchOptions = { headless: true };
    expect(opts.headless).toBe(true);
  });

  test("headless defaults to undefined when not set", () => {
    const opts: LaunchOptions = {};
    expect(opts.headless).toBeUndefined();
  });

  test("can combine headless with checkSession", () => {
    const opts: LaunchOptions = {
      headless: true,
      checkSession: () => true,
    };
    expect(opts.headless).toBe(true);
    expect(typeof opts.checkSession).toBe("function");
  });
});
