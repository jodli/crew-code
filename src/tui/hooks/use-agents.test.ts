import { describe, expect, test } from "bun:test";
import type { MemberDetail } from "../../core/status.ts";
import type { AgentSummary } from "./use-agents.ts";
import { isProcessAlive } from "../../lib/process.ts";

function toAgentSummary(member: MemberDetail): AgentSummary {
  const pid = parseInt(member.processId, 10);
  const alive = pid > 0 && isProcessAlive(pid);
  return {
    ...member,
    status: alive ? "alive" : "dead",
  };
}

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
  test("returns dead status when no PIDs", () => {
    const members: MemberDetail[] = [
      makeMember({ name: "team-lead", processId: "" }),
      makeMember({ name: "coder", processId: "0" }),
    ];

    const agents = members.map(toAgentSummary);
    expect(agents).toHaveLength(2);
    expect(agents[0].status).toBe("dead");
    expect(agents[1].status).toBe("dead");
  });

  test("returns alive status for running process", () => {
    const members: MemberDetail[] = [
      makeMember({ name: "team-lead", processId: String(process.pid), sessionId: "sess-123" }),
    ];

    const agents = members.map(toAgentSummary);
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

    const agent = toAgentSummary(member);
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
