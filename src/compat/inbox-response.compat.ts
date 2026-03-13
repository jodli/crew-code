/**
 * Compat test: Agent writes response to team-lead inbox.
 *
 * After reading its initial message, the agent should send a response
 * back to the team-lead's inbox file.
 */
import { describe, test, expect, afterEach } from "bun:test";
import {
  createTestTeam,
  registerAgent,
  seedInbox,
  launchAgent,
  killPane,
  pollInbox,
  waitForAgentIdle,
  COMPAT_MODEL,
  type TestTeam,
} from "./helpers.ts";

describe("compat: inbox response", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("agent sends response to team-lead inbox", async () => {
    team = await createTestTeam("inbox-resp");
    const agentName = "responder";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(
      team,
      agentName,
      "Hello! Please introduce yourself with a short greeting.",
    );

    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    // Poll team-lead inbox for response
    const leadMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 30_000,
      minMessages: 1,
    });

    expect(leadMessages.length).toBeGreaterThanOrEqual(1);

    const response = leadMessages[0] as {
      from?: string;
      text?: string;
      timestamp?: string;
      read?: boolean;
    };

    // The message should come from our agent
    expect(response.from).toBe(agentName);
    // It should have text content
    expect(response.text).toBeDefined();
    expect(typeof response.text).toBe("string");
    expect((response.text as string).length).toBeGreaterThan(0);
    // It should have a timestamp
    expect(response.timestamp).toBeDefined();
    // It should be unread (team-lead hasn't read it)
    expect(response.read).toBe(false);
  }, 120_000);
});
