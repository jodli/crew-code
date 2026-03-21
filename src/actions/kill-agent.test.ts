import { describe, expect, test } from "bun:test";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import { ok } from "../types/result.ts";
import { killAgent } from "./kill-agent.ts";

function makeMockRegistry(entries: Map<string, number> = new Map()): ProcessRegistry & { killed: string[] } {
  const killed: string[] = [];
  return {
    killed,
    async activate() {
      return ok(undefined);
    },
    async deactivate() {
      return ok(undefined);
    },
    async isAlive(_team, agentId) {
      return entries.has(agentId);
    },
    async kill(_team, agentId) {
      killed.push(agentId);
      entries.delete(agentId);
      return ok(true);
    },
    async listActive() {
      return ok([]);
    },
    async cleanup() {
      return ok(undefined);
    },
  };
}

describe("actions/killAgent", () => {
  test("calls registry.kill when registry is provided", async () => {
    const registry = makeMockRegistry(new Map([["scout@team", 123]]));
    const result = await killAgent(registry, "team", "scout@team");
    expect(result.ok).toBe(true);
    expect(registry.killed).toEqual(["scout@team"]);
  });

  test("returns ok(false) when no registry is provided", async () => {
    const result = await killAgent(undefined, "team", "scout@team");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(false);
    }
  });
});
