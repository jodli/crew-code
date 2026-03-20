import { describe, expect, test } from "bun:test";
import { selectLaunchMode } from "./launch.ts";
import type { AgentLaunchInfo } from "../types/domain.ts";

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
    const mode = selectLaunchMode(
      { ...base, sessionId: undefined },
      () => true,
    );
    expect(mode).toBe("new");
  });

  test("passes cwd and sessionId to checkSession", () => {
    let calledWith: [string, string] | null = null;
    selectLaunchMode(base, (cwd, sessionId) => {
      calledWith = [cwd, sessionId];
      return false;
    });
    expect(calledWith).toEqual(["/home/user/repos", "abc-def-123"]);
  });
});
