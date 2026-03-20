import { describe, expect, test } from "bun:test";
import type { MemberDetail } from "../../core/status.ts";
import { toAgentSummary, type AgentSummary } from "./use-agents.ts";

function makeMember(overrides: Partial<MemberDetail> & { name: string }): MemberDetail {
  return {
    agentId: `${overrides.name}@test`,
    agentType: "general-purpose",
    processId: "",
    cwd: "/tmp/project",
    unreadCount: 0,
    ...overrides,
  };
}

describe("useAgents — data layer", () => {
  test("returns dead status when agent is not in live set", () => {
    const members: MemberDetail[] = [
      makeMember({ name: "team-lead", processId: "" }),
      makeMember({ name: "coder", processId: "0" }),
    ];

    const liveAgentIds = new Set<string>();
    const agents = members.map((m) => toAgentSummary(m, liveAgentIds));
    expect(agents).toHaveLength(2);
    expect(agents[0].status).toBe("dead");
    expect(agents[1].status).toBe("dead");
  });

  test("returns alive status when agent is in live set", () => {
    const members: MemberDetail[] = [
      makeMember({ name: "team-lead", agentId: "team-lead@test", processId: String(process.pid), sessionId: "sess-123" }),
    ];

    const liveAgentIds = new Set(["team-lead@test"]);
    const agents = members.map((m) => toAgentSummary(m, liveAgentIds));
    expect(agents).toHaveLength(1);
    expect(agents[0].status).toBe("alive");
    expect(agents[0].sessionId).toBe("sess-123");
    expect(agents[0].cwd).toBe("/tmp/project");
  });

  test("includes all fields in summary", () => {
    const member = makeMember({
      name: "writer",
      agentId: "writer@gamma",
      agentType: "team-lead",
      processId: "",
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
      status: "dead",
      processId: "",
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
