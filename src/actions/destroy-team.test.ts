import { describe, expect, test } from "bun:test";
import { destroyTeam } from "./destroy-team.ts";
import type { AppContext } from "../types/context.ts";
import { ok, err } from "../types/result.ts";

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      updateTeam: async (_n, u) => ok(u({} as any)),
      teamExists: async () => false,
      createTeam: async () => ok(undefined),
      listTeams: async () => ok([]),
      deleteTeam: async () => ok(undefined),
    },
    inboxStore: {
      createInbox: async () => ok(undefined),
      readMessages: async () => ok([]),
      appendMessage: async () => ok(undefined),
      listInboxes: async () => ok([]),
      deleteInbox: async () => ok(undefined),
    },
    ...overrides,
  };
}

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
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () =>
          ok({
            name: "t",
            createdAt: 0,
            leadSessionId: "x",
            members: [],
          }),
        deleteTeam: async () =>
          err({ kind: "file_write_failed", path: "/fake", detail: "boom" }),
      },
    });

    const result = await destroyTeam(ctx, { team: "t" });
    expect(result.ok).toBe(false);
  });

  test("returns ok with plan on success", async () => {
    const ctx = makeCtx({
      configStore: {
        ...makeCtx().configStore,
        getTeam: async () =>
          ok({
            name: "t",
            createdAt: 0,
            leadSessionId: "x",
            members: [],
          }),
      },
    });

    const result = await destroyTeam(ctx, { team: "t" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.team).toBe("t");
    }
  });
});
