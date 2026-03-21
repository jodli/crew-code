import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../adapters/yaml-blueprint-store.ts";
import type { AppContext } from "../../types/context.ts";

let tmpDir: string;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "crew-api-blueprints-"));
  const ctx: AppContext = {
    configStore: new JsonFileConfigStore({
      configPath: (name: string) => join(tmpDir, "teams", name, "config.json"),
      teamsDir: () => join(tmpDir, "teams"),
    }),
    inboxStore: new JsonFileInboxStore({
      inboxPath: (team: string, agent: string) => join(tmpDir, "teams", team, "inboxes", `${agent}.json`),
    }),
    blueprintStore: new YamlBlueprintStore(join(tmpDir, "blueprints")),
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

const sampleBlueprint = {
  name: "review-team",
  description: "Code review",
  agents: [
    { name: "lead", agentType: "team-lead" },
    { name: "reviewer", prompt: "Review code" },
  ],
};

describe("GET /api/blueprints", () => {
  test("returns empty list initially", async () => {
    const res = await app.request("/api/blueprints");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/blueprints", () => {
  test("creates a blueprint from raw content", async () => {
    const res = await app.request("/api/blueprints", json(sampleBlueprint));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("review-team");
  });

  test("lists blueprint after creation", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(["review-team"]);
  });

  test("returns 409 for duplicate blueprint", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints", json(sampleBlueprint));
    expect(res.status).toBe(409);
  });

  test("creates blueprint from team export", async () => {
    // Create a team with an agent first
    await app.request("/api/teams", json({ name: "alpha" }));
    await app.request("/api/teams/alpha/agents", json({ name: "coder" }));

    const res = await app.request("/api/blueprints", json({ fromTeam: "alpha" }));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("alpha");
    expect(body.agents).toBeArray();
  });
});

describe("GET /api/blueprints/:name", () => {
  test("returns blueprint details", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints/review-team");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("review-team");
    expect(body.agents).toHaveLength(2);
  });

  test("returns 404 for missing blueprint", async () => {
    const res = await app.request("/api/blueprints/nope");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/blueprints/:name", () => {
  test("updates blueprint description", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints/review-team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Updated description" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.description).toBe("Updated description");
  });
});

describe("POST /api/blueprints/:name/deploy", () => {
  test("deploys a blueprint as a new team", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints/review-team/deploy", json({}));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.teamName).toBe("review-team");
    expect(body.launchOptions).toBeArray();
  });

  test("deploys with team name override", async () => {
    await app.request("/api/blueprints", json(sampleBlueprint));
    const res = await app.request("/api/blueprints/review-team/deploy", json({ teamName: "custom" }));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.teamName).toBe("custom");
  });

  test("returns 404 for missing blueprint", async () => {
    const res = await app.request("/api/blueprints/nope/deploy", json({}));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/teams/:name/blueprint", () => {
  test("exports running team as blueprint", async () => {
    await app.request("/api/teams", json({ name: "alpha" }));
    await app.request("/api/teams/alpha/agents", json({ name: "coder" }));

    const res = await app.request("/api/teams/alpha/blueprint");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("alpha");
    expect(body.agents).toBeArray();
  });

  test("returns 404 for missing team", async () => {
    const res = await app.request("/api/teams/nope/blueprint");
    expect(res.status).toBe(404);
  });
});
