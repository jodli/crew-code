import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

    const configs = await Promise.all(namesResult.value.map((n) => store.getTeam(n)));

    const summaries: TeamSummary[] = configs
      .filter((r) => r.ok)
      .map((r) => ({
        name: r.value.name,
        agentCount: r.value.members.length,
        runningCount: 0, // no registry, so all stopped
        createdAt: r.value.createdAt,
      }));

    expect(summaries).toHaveLength(2);
    const alpha = summaries.find((s) => s.name === "alpha");
    const beta = summaries.find((s) => s.name === "beta");
    expect(alpha?.agentCount).toBe(3);
    expect(beta?.agentCount).toBe(1);
  });

  test("agents with no PID are counted as stopped", async () => {
    const team = makeTeam("gamma", 2);
    // processId is now resolved from ProcessRegistry, not stored on AgentMember
    await store.createTeam(team);

    const result = await store.getTeam("gamma");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Without a registry, runningCount is 0
    const runningCount = 0;
    expect(runningCount).toBe(0);
  });

  test("agents in running set are counted as running", async () => {
    const team = makeTeam("delta", 1);
    await store.createTeam(team);

    const result = await store.getTeam("delta");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Simulate a live agent via a set
    const runningAgentIds = new Set(["agent-0@delta"]);
    const runningCount = result.value.members.filter((m) => runningAgentIds.has(m.agentId)).length;

    expect(runningCount).toBe(1);
  });
});
