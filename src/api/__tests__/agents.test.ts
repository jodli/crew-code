import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../types/context.ts";

let tmpDir: string;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-api-agents-"));
  const ctx: AppContext = {
    configStore: new JsonFileConfigStore({
      configPath: (name: string) => join(tmpDir, name, "config.json"),
      teamsDir: () => tmpDir,
    }),
    inboxStore: new JsonFileInboxStore({
      inboxPath: (team: string, agent: string) => join(tmpDir, team, "inboxes", `${agent}.json`),
    }),
  };
  app = createApp(ctx);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function json(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function createTeam(name: string) {
  await app.request("/api/teams", json({ name }));
}

describe("GET /api/teams/:name/agents", () => {
  test("returns empty list for new team", async () => {
    await createTeam("alpha");
    const res = await app.request("/api/teams/alpha/agents");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("returns 404 for missing team", async () => {
    const res = await app.request("/api/teams/nope/agents");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/teams/:name/agents", () => {
  test("spawns an agent and returns launch options", async () => {
    await createTeam("alpha");
    const res = await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("coder");
    expect(body.team).toBe("alpha");
    expect(body.launchOptions).toBeDefined();
  });

  test("returns 409 for duplicate agent", async () => {
    await createTeam("alpha");
    await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
    const res = await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/teams/:name/agents/:agent", () => {
  test("updates agent properties", async () => {
    await createTeam("alpha");
    await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
    const res = await app.request("/api/teams/alpha/agents/coder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  test("returns 404 for missing agent", async () => {
    await createTeam("alpha");
    const res = await app.request("/api/teams/alpha/agents/nope", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teams/:name/agents/:agent", () => {
  test("removes an agent", async () => {
    await createTeam("alpha");
    await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
    const res = await app.request("/api/teams/alpha/agents/coder", { method: "DELETE" });
    expect(res.status).toBe(204);

    const listRes = await app.request("/api/teams/alpha/agents");
    expect(await listRes.json()).toEqual([]);
  });

  test("returns 404 for missing agent", async () => {
    await createTeam("alpha");
    const res = await app.request("/api/teams/alpha/agents/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
