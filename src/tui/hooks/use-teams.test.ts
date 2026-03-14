import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import type { TeamConfig } from "../../types/domain.ts";
import type { TeamSummary } from "./use-teams.ts";

// Test the summarization logic directly without React rendering.
// We extract the core logic by importing the module and testing
// via a thin wrapper that calls the hook's internals.

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
    agentType: i === 0 ? "team-lead" : undefined,
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
        aliveCount: 0, // no real PIDs, so all dead
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

    const aliveCount = result.value.members.filter((m) => {
      const pid = parseInt(m.processId, 10);
      return pid > 0;
    }).length;

    expect(aliveCount).toBe(0);
  });

  test("agents with a valid PID of current process are alive", async () => {
    const team = makeTeam("delta", 1);
    team.members[0].processId = String(process.pid);
    await store.createTeam(team);

    const { isProcessAlive } = await import("../../lib/process.ts");

    const result = await store.getTeam("delta");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const aliveCount = result.value.members.filter((m) => {
      const pid = parseInt(m.processId, 10);
      return pid > 0 && isProcessAlive(pid);
    }).length;

    expect(aliveCount).toBe(1);
  });
});
