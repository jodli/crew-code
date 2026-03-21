/**
 * Compat test: Optional flags still optional.
 *
 * --agent-color and --parent-session-id should remain optional.
 * Agent launched WITH these flags should still function normally.
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

describe("compat: optional flags", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("--agent-color and --parent-session-id are optional", async () => {
    team = await createTestTeam("opt-flags");
    const agentName = "colorful";

    await registerAgent(team, agentName, {
      model: COMPAT_MODEL,
      color: "blue",
    });
    await seedInbox(team, agentName, "Hello! Please greet the team briefly.");

    // Launch WITH optional flags
    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      color: "blue",
      parentSessionId: team.leadSessionId,
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
