/**
 * Compat test: Fake session ID accepted.
 *
 * An all-zeros parent-session-id should still be accepted.
 * No validation is expected on this field.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
  COMPAT_MODEL,
  createTestTeam,
  killPane,
  launchAgent,
  pollInbox,
  registerAgent,
  seedInbox,
  type TestTeam,
  waitForAgentIdle,
} from "./helpers.ts";

describe("compat: fake session ID", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("all-zeros session ID still accepted", async () => {
    team = await createTestTeam("fake-sid");
    const agentName = "ghost";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Hi there! Please say hello briefly.");

    // Launch with a fake all-zeros session ID
    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: "00000000-0000-0000-0000-000000000000",
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    const leadMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 10_000,
      minMessages: 1,
    });

    expect(leadMessages.length).toBeGreaterThanOrEqual(1);
    const msg = leadMessages[0] as { from?: string; text?: string };
    expect(msg.from).toBeDefined();
    expect(typeof msg.text).toBe("string");
  }, 120_000);
});
