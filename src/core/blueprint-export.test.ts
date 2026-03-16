import { describe, expect, test } from "bun:test";
import { teamToBlueprint } from "./blueprint-export.ts";
import type { TeamConfig } from "../types/domain.ts";

const baseConfig: TeamConfig = {
  name: "my-team",
  description: "A cool team",
  createdAt: 1773387766070,
  leadSessionId: "abc-123",
  members: [
    {
      agentId: "team-lead@my-team",
      name: "team-lead",
      isLead: true,
      joinedAt: 1773387766070,
      processId: "123",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
      sessionId: "abc-123",
    },
    {
      agentId: "reviewer@my-team",
      name: "reviewer",
      joinedAt: 1773387766070,
      processId: "456",
      cwd: "/tmp",
      subscriptions: [],
      isActive: true,
      sessionId: "def-456",
      systemPrompt: "Review code for issues",
      model: "claude-opus-4-6",
      color: "red",
      extraArgs: ["--verbose"],
    },
    {
      agentId: "checker@my-team",
      name: "checker",
      joinedAt: 1773387766070,
      processId: "789",
      cwd: "/tmp",
      subscriptions: [],
      isActive: false,
      sessionId: "ghi-789",
      systemPrompt: "Check style",
    },
  ],
};

describe("teamToBlueprint", () => {
  test("includes team-lead in agents with isLead: true", () => {
    const bp = teamToBlueprint(baseConfig);
    const lead = bp.agents.find((a) => a.name === "team-lead");
    expect(lead).toBeDefined();
    expect(lead!.isLead).toBe(true);
  });

  test("maps agent fields correctly", () => {
    const bp = teamToBlueprint(baseConfig);
    expect(bp.agents).toHaveLength(3);

    const reviewer = bp.agents.find((a) => a.name === "reviewer");
    expect(reviewer).toEqual({
      name: "reviewer",
      systemPrompt: "Review code for issues",
      model: "claude-opus-4-6",
      color: "red",
      extraArgs: ["--verbose"],
    });
  });

  test("omits undefined optional fields", () => {
    const bp = teamToBlueprint(baseConfig);
    const checker = bp.agents.find((a) => a.name === "checker");
    expect(checker).toEqual({
      name: "checker",
      systemPrompt: "Check style",
    });
    expect(checker).not.toHaveProperty("model");
    expect(checker).not.toHaveProperty("color");
    expect(checker).not.toHaveProperty("extraArgs");
    expect(checker).not.toHaveProperty("isLead");
  });

  test("includes team name and description", () => {
    const bp = teamToBlueprint(baseConfig);
    expect(bp.name).toBe("my-team");
    expect(bp.description).toBe("A cool team");
  });

  test("omits description if not set", () => {
    const config = { ...baseConfig, description: undefined };
    const bp = teamToBlueprint(config);
    expect(bp).not.toHaveProperty("description");
  });

  test("strips ephemeral fields (processId, sessionId, etc.)", () => {
    const bp = teamToBlueprint(baseConfig);
    for (const agent of bp.agents) {
      expect(agent).not.toHaveProperty("processId");
      expect(agent).not.toHaveProperty("sessionId");
      expect(agent).not.toHaveProperty("isActive");
      expect(agent).not.toHaveProperty("joinedAt");
      expect(agent).not.toHaveProperty("cwd");
      expect(agent).not.toHaveProperty("agentId");
    }
  });
});
