/**
 * Compat test: Env var still required.
 *
 * Without CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, the agent flags
 * should be silently ignored and Claude starts as a normal session.
 * We detect this by checking that the agent does NOT read/process its inbox.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
  COMPAT_MODEL,
  createTestTeam,
  killPane,
  launchAgent,
  readInbox,
  registerAgent,
  seedInbox,
  type TestTeam,
} from "./helpers.ts";

describe("compat: env var required", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("agent flags ignored without env var", async () => {
    team = await createTestTeam("env-var");
    const agentName = "probe";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Please respond with a short greeting.");

    // Launch WITHOUT the env var
    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "0" },
    });

    // Wait a bit — without agent mode, Claude won't process the inbox
    await Bun.sleep(10_000);
    await killPane(paneId);
    paneId = undefined;

    // The team-lead inbox should NOT have a response
    const leadInbox = await readInbox(team, "team-lead");
    expect(leadInbox.length).toBe(0);
  }, 30_000);
});
