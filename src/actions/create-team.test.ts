import { describe, expect, test } from "bun:test";
import { planCreate, createTeam } from "./create-team.ts";
import type { AppContext } from "../types/context.ts";
import { ok, err } from "../types/result.ts";

function makeCtx(teamExists = false): AppContext {
  return {
    configStore: {
      getTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      updateTeam: async () => err({ kind: "config_not_found", path: "/fake" }),
      teamExists: async () => teamExists,
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
  };
}

describe("actions/create-team", () => {
  test("re-exports planCreate for pre-validation", () => {
    expect(typeof planCreate).toBe("function");
  });

  test("createTeam propagates plan error (team_already_exists)", async () => {
    const ctx = makeCtx(true);
    const result = await createTeam(ctx, { name: "existing" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("team_already_exists");
    }
  });

  test("createTeam returns ok on success", async () => {
    const ctx = makeCtx(false);
    const result = await createTeam(ctx, { name: "my-team" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("my-team");
    }
  });
});
