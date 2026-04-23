import { describe, expect, test } from "bun:test";
import type { AppContext } from "../types/context.ts";
import type { AgentMember, TeamConfig } from "../types/domain.ts";
import { ok } from "../types/result.ts";
import { startTeam } from "./start-team.ts";

function makeMember(overrides: Partial<AgentMember> = {}): AgentMember {
  return {
    agentId: `id-${overrides.name ?? "agent"}`,
    name: overrides.name ?? "agent",
    agentType: overrides.agentType ?? "general-purpose",
    cwd: "/tmp",
    joinedAt: Date.now(),
    subscriptions: [],
    sessionId: "session-123",
    ...overrides,
  };
}

function makeTeam(members: AgentMember[], overrides: Partial<TeamConfig> = {}): TeamConfig {
  return {
    name: "alpha",
    createdAt: Date.now(),
    leadAgentId: members[0]?.agentId ?? "id-lead",
    leadSessionId: "lead-session",
    members,
    ...overrides,
  };
}

function makeCtx(team: TeamConfig | null): AppContext {
  return {
    configStore: {
      getTeam: async (name: string) => {
        if (!team) return { ok: false, error: { kind: "config_not_found" as const, path: name } };
        return ok(team);
      },
    } as AppContext["configStore"],
    inboxStore: {} as AppContext["inboxStore"],
  };
}

describe("startTeam", () => {
  test("returns all agents with launchOptions for a team", async () => {
    const lead = makeMember({ name: "lead", agentType: "team-lead" });
    const coder = makeMember({ name: "coder" });
    const team = makeTeam([lead, coder]);
    const ctx = makeCtx(team);

    const result = await startTeam(ctx, { team: "alpha" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agents).toHaveLength(2);
    expect(result.value.agents[0].name).toBe("lead");
    expect(result.value.agents[0].isLead).toBe(true);
    expect(result.value.agents[1].name).toBe("coder");
    expect(result.value.agents[1].isLead).toBe(false);
    expect(result.value.skipped).toHaveLength(0);
  });

  test("team-lead is first in the list", async () => {
    const coder = makeMember({ name: "coder" });
    const lead = makeMember({ name: "lead", agentType: "team-lead" });
    const team = makeTeam([coder, lead]);
    const ctx = makeCtx(team);

    const result = await startTeam(ctx, { team: "alpha" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agents[0].name).toBe("lead");
    expect(result.value.agents[1].name).toBe("coder");
  });

  test("skips agents without sessionId", async () => {
    const lead = makeMember({ name: "lead", agentType: "team-lead" });
    const noSession = makeMember({ name: "new-agent", sessionId: undefined });
    const team = makeTeam([lead, noSession]);
    const ctx = makeCtx(team);

    const result = await startTeam(ctx, { team: "alpha" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.agents).toHaveLength(1);
    expect(result.value.skipped).toHaveLength(1);
    expect(result.value.skipped[0].name).toBe("new-agent");
    expect(result.value.skipped[0].reason).toContain("session");
  });

  test("returns team_not_found for nonexistent team", async () => {
    const ctx = makeCtx(null);

    const result = await startTeam(ctx, { team: "nope" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("team_not_found");
  });

  test("builds correct launchOptions with parentSessionId for non-lead agents", async () => {
    const lead = makeMember({ name: "lead", agentType: "team-lead", sessionId: "lead-sess" });
    const coder = makeMember({ name: "coder", sessionId: "coder-sess" });
    const team = makeTeam([lead, coder], { leadSessionId: "lead-sess" });
    const ctx = makeCtx(team);

    const result = await startTeam(ctx, { team: "alpha" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const leadAgent = result.value.agents.find((a) => a.name === "lead");
    const coderAgent = result.value.agents.find((a) => a.name === "coder");
    expect(leadAgent!.launchOptions.parentSessionId).toBeUndefined();
    expect(coderAgent!.launchOptions.parentSessionId).toBe("lead-sess");
  });
});
