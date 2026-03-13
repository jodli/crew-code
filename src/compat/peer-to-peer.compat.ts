/**
 * Compat test: Peer-to-peer messaging.
 *
 * Two agents (alice and bob) can message each other without a real team lead.
 * Uses a fake session ID. Alice is told to message bob, bob should receive it.
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

describe("compat: peer-to-peer", () => {
  let team: TestTeam;
  const paneIds: string[] = [];

  afterEach(async () => {
    for (const id of paneIds) await killPane(id);
    paneIds.length = 0;
    if (team) await team.cleanup();
  });

  test("two agents message each other without real lead", async () => {
    team = await createTestTeam("p2p");
    const fakeSessionId = "00000000-0000-0000-0000-000000000000";

    // Register both agents
    await registerAgent(team, "alice", { model: COMPAT_MODEL });
    await registerAgent(team, "bob", { model: COMPAT_MODEL });

    // Seed alice's inbox — tell her to greet bob
    await seedInbox(
      team,
      "alice",
      "Hello alice! Please send a short greeting message to bob.",
    );

    // Seed bob's inbox — tell him to wait for messages
    await seedInbox(
      team,
      "bob",
      "Hello bob! Please wait for messages from your teammates and respond briefly.",
    );

    // Launch alice first
    const alicePane = await launchAgent(team, "alice", {
      model: COMPAT_MODEL,
      parentSessionId: fakeSessionId,
    });
    paneIds.push(alicePane);

    // Launch bob
    const bobPane = await launchAgent(team, "bob", {
      model: COMPAT_MODEL,
      parentSessionId: fakeSessionId,
    });
    paneIds.push(bobPane);

    // Wait for alice to go idle (she should have sent a message to bob)
    await waitForAgentIdle(alicePane, { timeoutMs: 90_000 });

    // Bob should receive a message from alice
    const bobMessages = await pollInbox(team, "bob", {
      timeoutMs: 60_000,
      minMessages: 2, // seed + alice's message
    });

    // Find a message from alice
    const fromAlice = (bobMessages as { from?: string }[]).find(
      (m) => m.from === "alice",
    );
    expect(fromAlice).toBeDefined();
  }, 180_000);
});
