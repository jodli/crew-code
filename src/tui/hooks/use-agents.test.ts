import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import type { TeamConfig } from "../../types/domain.ts";
import type { AgentSummary } from "./use-agents.ts";
import { isProcessAlive } from "../../lib/process.ts";

let tmpDir: string;
let store: JsonFileConfigStore;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-agents-test-"));
  store = new JsonFileConfigStore({
    configPath: (name: string) => join(tmpDir, name, "config.json"),
    teamsDir: () => tmpDir,
  });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function makeTeam(name: string, members: { name: string; processId: string; sessionId?: string }[]): TeamConfig {
  return {
    name,
    createdAt: Date.now(),
    leadAgentId: `agent-0@${name}`,
    leadSessionId: "sess-lead",
    members: members.map((m, i) => ({
      agentId: `${m.name}@${name}`,
      name: m.name,
      agentType: i === 0 ? "team-lead" : undefined,
      joinedAt: Date.now(),
      processId: m.processId,
      cwd: "/tmp/project",
      subscriptions: [],
      sessionId: m.sessionId,
    })),
  };
}

function summarizeFromConfig(team: TeamConfig): AgentSummary[] {
  return team.members.map((m) => {
    const pid = parseInt(m.processId, 10);
    return {
      name: m.name,
      agentId: m.agentId,
      status: (pid > 0 && isProcessAlive(pid) ? "alive" : "dead") as "alive" | "dead",
      sessionId: m.sessionId,
      cwd: m.cwd,
    };
  });
}

describe("useAgents — data layer", () => {
  test("returns agents with dead status when no PIDs", async () => {
    const team = makeTeam("alpha", [
      { name: "team-lead", processId: "" },
      { name: "coder", processId: "0" },
    ]);
    await store.createTeam(team);

    const result = await store.getTeam("alpha");
    if (!result.ok) throw new Error("should exist");

    const agents = summarizeFromConfig(result.value);
    expect(agents).toHaveLength(2);
    expect(agents[0].status).toBe("dead");
    expect(agents[1].status).toBe("dead");
  });

  test("returns alive status for running process", async () => {
    const team = makeTeam("beta", [
      { name: "team-lead", processId: String(process.pid), sessionId: "sess-123" },
    ]);
    await store.createTeam(team);

    const result = await store.getTeam("beta");
    if (!result.ok) throw new Error("should exist");

    const agents = summarizeFromConfig(result.value);
    expect(agents).toHaveLength(1);
    expect(agents[0].status).toBe("alive");
    expect(agents[0].sessionId).toBe("sess-123");
    expect(agents[0].cwd).toBe("/tmp/project");
  });

  test("returns empty for non-existent team", async () => {
    const result = await store.getTeam("nope");
    expect(result.ok).toBe(false);
  });

  test("includes all fields in summary", async () => {
    const team = makeTeam("gamma", [
      { name: "writer", processId: "", sessionId: "sess-w" },
    ]);
    await store.createTeam(team);

    const result = await store.getTeam("gamma");
    if (!result.ok) throw new Error("should exist");

    const agents = summarizeFromConfig(result.value);
    expect(agents[0]).toEqual({
      name: "writer",
      agentId: "writer@gamma",
      status: "dead",
      sessionId: "sess-w",
      cwd: "/tmp/project",
    });
  });
});
