import { describe, expect, test } from "bun:test";
import { makeCtx } from "../../test/helpers.ts";
import { createApp } from "../server.ts";

const app = createApp(makeCtx());

describe("GET /api/agent-types", () => {
  test("returns array including builtin types", async () => {
    const res = await app.request("/api/agent-types");
    expect(res.status).toBe(200);
    const body = (await res.json()) as string[];
    expect(body).toBeArray();
    expect(body).toContain("general-purpose");
    expect(body).toContain("team-lead");
  });
});

describe("GET /api/models", () => {
  test("returns array of model options", async () => {
    const res = await app.request("/api/models");
    expect(res.status).toBe(200);
    const body = (await res.json()) as string[];
    expect(body).toBeArray();
    expect(body).toContain("sonnet");
    expect(body).toContain("opus");
    expect(body).toContain("(default)");
  });
});
