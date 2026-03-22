import { describe, expect, test } from "bun:test";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import { ok } from "../types/result.ts";
import { stopAgent } from "./stop-agent.ts";

function makeMockRegistry(entries: Map<string, number> = new Map()): ProcessRegistry & { stopped: string[] } {
  const stopped: string[] = [];
  return {
    stopped,
    async activate() {
      return ok(undefined);
    },
    async deactivate() {
      return ok(undefined);
    },
    async isRunning(_team, agentId) {
      return entries.has(agentId);
    },
    async stop(_team, agentId) {
      stopped.push(agentId);
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

describe("actions/stopAgent", () => {
  test("calls registry.stop when registry is provided", async () => {
    const registry = makeMockRegistry(new Map([["scout@team", 123]]));
    const result = await stopAgent(registry, "team", "scout@team");
    expect(result.ok).toBe(true);
    expect(registry.stopped).toEqual(["scout@team"]);
  });

  test("returns ok(false) when no registry is provided", async () => {
    const result = await stopAgent(undefined, "team", "scout@team");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(false);
    }
  });
});
