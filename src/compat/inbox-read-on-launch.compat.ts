/**
 * Compat test: Agent reads inbox on startup.
 *
 * When an agent launches, it should read and process its seeded inbox
 * message. We verify by checking that the seed message gets marked as read.
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

describe("compat: inbox read on launch", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("agent processes seed message on startup", async () => {
    team = await createTestTeam("inbox-read");
    const agentName = "reader";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Welcome to the team! Please acknowledge with a brief greeting.");

    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    // The seed message should now be marked as read
    const agentMessages = await pollInbox(team, agentName, {
      timeoutMs: 10_000,
      minMessages: 1,
    });

    expect(agentMessages.length).toBeGreaterThanOrEqual(1);
    const seedMsg = agentMessages[0] as { read?: boolean; from?: string };
    expect(seedMsg.from).toBe("team-lead");
    expect(seedMsg.read).toBe(true);
  }, 120_000);
});
