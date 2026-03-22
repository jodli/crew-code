import { describe, expect, test } from "bun:test";
import { makeConfigStore, makeCtx } from "../test/helpers.ts";
import { err, ok } from "../types/result.ts";
import { removeTeam } from "./remove-team.ts";

describe("actions/remove-team", () => {
  test("propagates plan error (team_not_found)", async () => {
    const ctx = makeCtx();
    const result = await removeTeam(ctx, { team: "no-team" });

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
            leadAgentId: "team-lead@t",
            leadSessionId: "x",
            members: [],
          }),
        deleteTeam: async () => err({ kind: "file_write_failed", path: "/fake", detail: "boom" }),
      }),
    });

    const result = await removeTeam(ctx, { team: "t" });
    expect(result.ok).toBe(false);
  });

  test("returns ok with plan on success", async () => {
    const ctx = makeCtx({
      configStore: makeConfigStore({
        getTeam: async () =>
          ok({
            name: "t",
            createdAt: 0,
            leadAgentId: "team-lead@t",
            leadSessionId: "x",
            members: [],
          }),
      }),
    });

    const result = await removeTeam(ctx, { team: "t" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.team).toBe("t");
    }
  });
});
