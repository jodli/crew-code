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
  tmpDir = await mkdtemp(join(tmpdir(), "crew-api-doctor-"));
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

describe("GET /api/doctor", () => {
  test("returns diagnostics array", async () => {
    const res = await app.request("/api/doctor");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toBeArray();
  });

  test("does not include fix function in response", async () => {
    const res = await app.request("/api/doctor");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    for (const item of body) {
      expect(item["fix"]).toBeUndefined();
    }
  });
});

describe("POST /api/doctor/fix", () => {
  test("returns fix results array", async () => {
    const res = await app.request("/api/doctor/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toBeArray();
  });
});
