/**
 * Compat test: Minimum required flags.
 *
 * --agent-id, --agent-name, --team-name are the minimum required flags.
 * Agent should boot in team mode, read inbox, and respond.
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

describe("compat: minimum flags", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("agent boots with only --agent-id, --agent-name, --team-name", async () => {
    team = await createTestTeam("min-flags");
    const agentName = "worker";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Hello! Please introduce yourself briefly.");

    // Launch with only required flags (no --agent-color, no --parent-session-id)
    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      // no color, no parentSessionId
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    // Agent should have sent a response to team-lead inbox
    const leadMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 10_000,
      minMessages: 1,
    });

    expect(leadMessages.length).toBeGreaterThanOrEqual(1);
    const msg = leadMessages[0] as { from?: string; text?: string };
    expect(msg.from).toBeDefined();
    expect(msg.text).toBeDefined();
    expect(typeof msg.text).toBe("string");
  }, 120_000);
});
