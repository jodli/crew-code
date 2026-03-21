import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { CREW_SENDER } from "../../types/constants.ts";
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

async function seedCrewInbox(messages: unknown[]) {
  const inboxDir = join(tmpDir, "alpha", "inboxes");
  await mkdir(inboxDir, { recursive: true });
  await writeFile(
    join(inboxDir, `${CREW_SENDER}.json`),
    JSON.stringify(messages, null, 2),
  );
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
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
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
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
    expect(body.messages).toHaveLength(1);
  });

  test("returns empty inbox for agent with no messages", async () => {
    await setupTeamWithAgent();
    const res = await app.request("/api/teams/alpha/agents/coder/messages");
    expect(res.status).toBe(200);
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
    expect(body.messages).toHaveLength(0);
  });
});

describe("GET /api/teams/:name/messages (crew channel)", () => {
  test("returns crew channel messages", async () => {
    await setupTeamWithAgent();
    await seedCrewInbox([
      { from: "coder", text: "Response from agent", timestamp: "2026-03-21T18:00:00Z", read: false },
    ]);

    const res = await app.request("/api/teams/alpha/messages");
    expect(res.status).toBe(200);
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].text).toBe("Response from agent");
    expect(body.messages[0].from).toBe("coder");
    expect(body.unreadCount).toBe(1);
  });

  test("filters unread with ?status=unread", async () => {
    await setupTeamWithAgent();
    await seedCrewInbox([
      { from: "coder", text: "New msg", timestamp: "2026-03-21T18:00:00Z", read: false },
    ]);

    const res = await app.request("/api/teams/alpha/messages?status=unread");
    expect(res.status).toBe(200);
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
    expect(body.messages).toHaveLength(1);
  });

  test("returns empty when no crew inbox exists", async () => {
    await setupTeamWithAgent();
    const res = await app.request("/api/teams/alpha/messages");
    expect(res.status).toBe(200);
    const body = await res.json() as { messages: Array<Record<string, unknown>>; unreadCount: number; totalCount: number };
    expect(body.messages).toHaveLength(0);
  });

  test("returns 404 for non-existent team", async () => {
    const res = await app.request("/api/teams/nonexistent/messages");
    expect(res.status).toBe(404);
  });
});
