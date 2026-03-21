/**
 * Compat test: Inbox JSON array format unchanged.
 *
 * After an agent processes its inbox, the file should still be
 * a JSON array of message objects with the expected fields.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";
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

const InboxMessageSchema = z.object({
  from: z.string(),
  text: z.string(),
  summary: z.string().optional(),
  timestamp: z.string(),
  color: z.string().optional(),
  read: z.boolean(),
});

const InboxSchema = z.array(InboxMessageSchema);

describe("compat: inbox format", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("inbox files are JSON arrays with expected message fields", async () => {
    team = await createTestTeam("inbox-fmt");
    const agentName = "checker";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Hello! Say hi briefly and wait for tasks.");

    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    // Check agent's own inbox (seed message should now be marked read)
    const agentMessages = await pollInbox(team, agentName, {
      timeoutMs: 10_000,
      minMessages: 1,
    });
    const agentResult = InboxSchema.safeParse(agentMessages);
    expect(agentResult.success).toBe(true);

    // Check team-lead inbox (should have response)
    const leadMessages = await pollInbox(team, "team-lead", {
      timeoutMs: 10_000,
      minMessages: 1,
    });
    const leadResult = InboxSchema.safeParse(leadMessages);
    expect(leadResult.success).toBe(true);

    if (leadResult.success) {
      const msg = leadResult.data[0];
      expect(msg.from).toBeDefined();
      expect(msg.text).toBeDefined();
      expect(msg.timestamp).toBeDefined();
      expect(typeof msg.read).toBe("boolean");
    }
  }, 120_000);
});
