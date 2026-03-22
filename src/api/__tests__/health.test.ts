import { describe, expect, test } from "bun:test";
import { createApp } from "../server.ts";

const app = createApp({
  configStore: {} as never,
  inboxStore: {} as never,
});

describe("GET /api/health", () => {
  test("returns 200 with status, version, and uptime", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
  });
});
