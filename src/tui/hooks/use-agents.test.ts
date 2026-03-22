import { describe, expect, test } from "bun:test";
import type { MemberDetail } from "../../core/status.ts";
import { toAgentSummary } from "./use-agents.ts";

function makeMember(overrides: Partial<MemberDetail> & { name: string }): MemberDetail {
  return {
    agentId: `${overrides.name}@test`,
    agentType: "general-purpose",
    cwd: "/tmp/project",
    unreadCount: 0,
    ...overrides,
  };
}

describe("useAgents — data layer", () => {
  test("returns stopped status when agent is not in running set", () => {
    const members: MemberDetail[] = [makeMember({ name: "team-lead" }), makeMember({ name: "coder" })];

    const runningAgentIds = new Set<string>();
    const agents = members.map((m) => toAgentSummary(m, runningAgentIds));
    expect(agents).toHaveLength(2);
    expect(agents[0].status).toBe("stopped");
    expect(agents[1].status).toBe("stopped");
  });

  test("returns running status when agent is in running set", () => {
    const members: MemberDetail[] = [
      makeMember({ name: "team-lead", agentId: "team-lead@test", processId: process.pid, sessionId: "sess-123" }),
    ];

    const runningAgentIds = new Set(["team-lead@test"]);
    const agents = members.map((m) => toAgentSummary(m, runningAgentIds));
    expect(agents).toHaveLength(1);
    expect(agents[0].status).toBe("running");
    expect(agents[0].sessionId).toBe("sess-123");
    expect(agents[0].cwd).toBe("/tmp/project");
  });

  test("includes all fields in summary", () => {
    const member = makeMember({
      name: "writer",
      agentId: "writer@gamma",
      agentType: "team-lead",
      sessionId: "sess-w",
      model: "claude-sonnet-4-6",
      prompt: "Write docs",
      color: "#ff0000",
      extraArgs: ["--verbose"],
    });

    const agent = toAgentSummary(member, new Set<string>());
    expect(agent).toEqual({
      name: "writer",
      agentId: "writer@gamma",
      agentType: "team-lead",
      status: "stopped",
      sessionId: "sess-w",
      model: "claude-sonnet-4-6",
      prompt: "Write docs",
      color: "#ff0000",
      cwd: "/tmp/project",
      unreadCount: 0,
      extraArgs: ["--verbose"],
    });
  });
});
