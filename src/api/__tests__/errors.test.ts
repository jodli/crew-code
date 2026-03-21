import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { errorStatus, errorResponse } from "../errors.ts";
import type { CrewError } from "../../types/errors.ts";

describe("errorStatus", () => {
  test("maps not-found errors to 404", () => {
    expect(errorStatus({ kind: "team_not_found", team: "x" })).toBe(404);
    expect(errorStatus({ kind: "agent_not_found", agent: "a", team: "x" })).toBe(404);
    expect(errorStatus({ kind: "blueprint_not_found", name: "x" })).toBe(404);
    expect(errorStatus({ kind: "config_not_found", path: "/x" })).toBe(404);
  });

  test("maps conflict errors to 409", () => {
    expect(errorStatus({ kind: "team_already_exists", team: "x" })).toBe(409);
    expect(errorStatus({ kind: "agent_already_exists", agent: "a", team: "x" })).toBe(409);
    expect(errorStatus({ kind: "blueprint_already_exists", name: "x" })).toBe(409);
  });

  test("maps validation errors to 422", () => {
    expect(errorStatus({ kind: "blueprint_invalid", name: "x", detail: "bad" })).toBe(422);
    expect(errorStatus({ kind: "schema_validation_failed", path: "/x", detail: "bad" })).toBe(422);
    expect(errorStatus({ kind: "preflight_failed", detail: "bad" })).toBe(422);
  });

  test("maps lock_failed to 423", () => {
    expect(errorStatus({ kind: "lock_failed", path: "/x", detail: "busy" })).toBe(423);
  });

  test("maps unknown errors to 500", () => {
    expect(errorStatus({ kind: "file_read_failed", path: "/x", detail: "boom" })).toBe(500);
    expect(errorStatus({ kind: "launch_failed", detail: "boom" })).toBe(500);
  });
});

describe("errorResponse", () => {
  test("returns JSON with correct shape and status", async () => {
    const app = new Hono();
    app.get("/test", (c) => {
      const err: CrewError = { kind: "team_not_found", team: "alpha" };
      return errorResponse(c, err);
    });

    const res = await app.request("/test");
    expect(res.status).toBe(404);

    const body = await res.json() as { error: { kind: string; message: string } };
    expect(body.error.kind).toBe("team_not_found");
    expect(body.error.message).toContain("alpha");
  });
});
