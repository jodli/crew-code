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
  tmpDir = await mkdtemp(join(tmpdir(), "crew-api-messages-"));
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

async function setupTeamWithAgent() {
  await app.request("/api/teams", json({ name: "alpha" }));
  await app.request("/api/teams/alpha/agents", json({ name: "coder" }));
}

describe("POST /api/teams/:name/agents/:agent/messages", () => {
  test("sends a message", async () => {
    await setupTeamWithAgent();
    const res = await app.request(
      "/api/teams/alpha/agents/coder/messages",
      json({ message: "Hello!", from: "api" }),
    );
    expect(res.status).toBe(201);
  });
});

describe("GET /api/teams/:name/agents/:agent/messages", () => {
  test("returns inbox with sent messages", async () => {
    await setupTeamWithAgent();
    await app.request(
      "/api/teams/alpha/agents/coder/messages",
      json({ message: "Hello!", from: "api" }),
    );

    const res = await app.request("/api/teams/alpha/agents/coder/messages");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].text).toBe("Hello!");
    expect(body.unreadCount).toBe(1);
  });

  test("filters unread with ?status=unread", async () => {
    await setupTeamWithAgent();
    await app.request(
      "/api/teams/alpha/agents/coder/messages",
      json({ message: "Hello!", from: "api" }),
    );

    const res = await app.request("/api/teams/alpha/agents/coder/messages?status=unread");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(1);
  });

  test("returns empty inbox for agent with no messages", async () => {
    await setupTeamWithAgent();
    const res = await app.request("/api/teams/alpha/agents/coder/messages");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(0);
  });
});
