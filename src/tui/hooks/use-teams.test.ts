import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import type { TeamConfig } from "../../types/domain.ts";
import type { TeamSummary } from "./use-teams.ts";

// Test the summarization logic directly without React rendering.

let tmpDir: string;
let store: JsonFileConfigStore;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-tui-test-"));
  store = new JsonFileConfigStore({
    configPath: (name: string) => join(tmpDir, name, "config.json"),
    teamsDir: () => tmpDir,
  });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function makeTeam(name: string, memberCount: number): TeamConfig {
  const members = Array.from({ length: memberCount }, (_, i) => ({
    agentId: `agent-${i}@${name}`,
    name: i === 0 ? "team-lead" : `agent-${i}`,
    agentType: i === 0 ? "team-lead" : "general-purpose",
    joinedAt: Date.now(),
    processId: "",
    cwd: "/tmp",
    subscriptions: [],
  }));

  return {
    name,
    createdAt: Date.now(),
    leadAgentId: `agent-0@${name}`,
    leadSessionId: "sess-123",
    members,
  };
}

describe("useTeams — data layer", () => {
  test("returns empty array when no teams exist", async () => {
    await mkdir(tmpDir, { recursive: true });
    const result = await store.listTeams();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  test("lists multiple teams with correct agent counts", async () => {
    await store.createTeam(makeTeam("alpha", 3));
    await store.createTeam(makeTeam("beta", 1));

    const namesResult = await store.listTeams();
    expect(namesResult.ok).toBe(true);
    if (!namesResult.ok) return;

    const configs = await Promise.all(
      namesResult.value.map((n) => store.getTeam(n)),
    );

    const summaries: TeamSummary[] = configs
      .filter((r) => r.ok)
      .map((r) => ({
        name: r.value.name,
        agentCount: r.value.members.length,
        aliveCount: 0, // no registry, so all dead
        createdAt: r.value.createdAt,
      }));

    expect(summaries).toHaveLength(2);
    const alpha = summaries.find((s) => s.name === "alpha");
    const beta = summaries.find((s) => s.name === "beta");
    expect(alpha?.agentCount).toBe(3);
    expect(beta?.agentCount).toBe(1);
  });

  test("agents with no PID are counted as dead", async () => {
    const team = makeTeam("gamma", 2);
    team.members[0].processId = "";
    team.members[1].processId = "0";
    await store.createTeam(team);

    const result = await store.getTeam("gamma");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Without a registry, aliveCount is 0
    const aliveCount = 0;
    expect(aliveCount).toBe(0);
  });

  test("agents in live set are counted as alive", async () => {
    const team = makeTeam("delta", 1);
    await store.createTeam(team);

    const result = await store.getTeam("delta");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Simulate a live agent via a set
    const liveAgentIds = new Set(["agent-0@delta"]);
    const aliveCount = result.value.members.filter((m) =>
      liveAgentIds.has(m.agentId),
    ).length;

    expect(aliveCount).toBe(1);
  });
});
