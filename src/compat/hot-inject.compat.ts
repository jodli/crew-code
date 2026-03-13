/**
 * Compat test: Hot message injection to idle agent.
 *
 * After an agent goes idle, writing a new message to its inbox file
 * should wake it up and trigger processing.
 */
import { describe, test, expect, afterEach } from "bun:test";
import {
  createTestTeam,
  registerAgent,
  seedInbox,
  launchAgent,
  killPane,
  pollInbox,
  appendToInbox,
  waitForAgentIdle,
  COMPAT_MODEL,
  type TestTeam,
} from "./helpers.ts";

describe("compat: hot inject", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("writing to idle agent inbox wakes it up", async () => {
    team = await createTestTeam("hot-inject");
    const agentName = "sleeper";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(
      team,
      agentName,
      "Welcome to the team! Please say hello and wait for further tasks.",
    );

    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
    });

    // Wait for agent to process initial message and go idle
    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    // Count current messages in team-lead inbox
    const beforeMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 30_000,
      minMessages: 1,
    });
    const countBefore = beforeMessages.length;

    // Inject a new message to the idle agent
    await appendToInbox(
      team,
      agentName,
      "Quick question: what is the capital of France? Answer in one word.",
    );

    // Wait for agent to wake up and respond
    await waitForAgentIdle(paneId, { timeoutMs: 90_000, quietMs: 8_000 });

    // There should be at least one more message in team-lead inbox
    const afterMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 30_000,
      minMessages: countBefore + 1,
    });

    expect(afterMessages.length).toBeGreaterThan(countBefore);
  }, 180_000);
});
