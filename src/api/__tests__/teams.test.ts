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
  tmpDir = await mkdtemp(join(tmpdir(), "crew-api-teams-"));
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

function patch(body: unknown) {
  return {
    method: "PATCH" as const,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("GET /api/teams", () => {
  test("returns empty list initially", async () => {
    const res = await app.request("/api/teams");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("returns teams after creation", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    const res = await app.request("/api/teams");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("alpha");
  });
});

describe("POST /api/teams", () => {
  test("creates a team", async () => {
    const res = await app.request("/api/teams", json({ name: "alpha", description: "Test team" }));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body["name"]).toBe("alpha");
  });

  test("returns 409 for duplicate team", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    const res = await app.request("/api/teams", json({ name: "alpha" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: { kind: string } };
    expect(body.error.kind).toBe("team_already_exists");
  });
});

describe("GET /api/teams/:name", () => {
  test("returns team detail", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    const res = await app.request("/api/teams/alpha");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body["name"]).toBe("alpha");
    expect(body["members"]).toBeArray();
  });

  test("returns 404 for missing team", async () => {
    const res = await app.request("/api/teams/nope");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/teams/:name", () => {
  test("updates team description", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    const res = await app.request("/api/teams/alpha", patch({ description: "Updated" }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body["description"]).toBe("Updated");
  });

  test("returns 404 for missing team", async () => {
    const res = await app.request("/api/teams/nope", patch({ description: "x" }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teams/:name", () => {
  test("destroys a team", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    const res = await app.request("/api/teams/alpha", { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await app.request("/api/teams");
    expect(await listRes.json()).toEqual([]);
  });

  test("returns 404 for missing team", async () => {
    const res = await app.request("/api/teams/nope", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
