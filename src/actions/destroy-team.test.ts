import { describe, expect, test } from "bun:test";
import { destroyTeam } from "./destroy-team.ts";
import { ok, err } from "../types/result.ts";
import { makeCtx, makeConfigStore } from "../test/helpers.ts";

describe("actions/destroy-team", () => {
  test("propagates plan error (team_not_found)", async () => {
    const ctx = makeCtx();
    const result = await destroyTeam(ctx, { team: "no-team" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_not_found");
    }
  });

  test("propagates execute error", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () =>
          ok({
            name: "t",
            createdAt: 0,
            leadSessionId: "x",
            members: [],
          }),
        deleteTeam: async () =>
          err({ kind: "file_write_failed", path: "/fake", detail: "boom" }),
      }),
    });

    const result = await destroyTeam(ctx, { team: "t" });
    expect(result.ok).toBe(false);
  });

  test("returns ok with plan on success", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () =>
          ok({
            name: "t",
            createdAt: 0,
            leadSessionId: "x",
            members: [],
          }),
      }),
    });

    const result = await destroyTeam(ctx, { team: "t" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.team).toBe("t");
    }
  });
});
