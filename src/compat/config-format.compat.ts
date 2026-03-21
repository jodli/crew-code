/**
 * Compat test: config.json schema unchanged.
 *
 * After an agent boots and responds, the config.json should still
 * match our expected schema (name, createdAt, leadAgentId, etc.).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { TeamConfigSchema } from "../config/schemas.ts";
import {
  COMPAT_MODEL,
  createTestTeam,
  killPane,
  launchAgent,
  readConfig,
  registerAgent,
  seedInbox,
  type TestTeam,
  waitForAgentIdle,
} from "./helpers.ts";

describe("compat: config format", () => {
  let team: TestTeam;
  let paneId: string | undefined;

  afterEach(async () => {
    if (paneId) await killPane(paneId);
    if (team) await team.cleanup();
  });

  test("config.json matches expected schema after agent boots", async () => {
    team = await createTestTeam("cfg-fmt");
    const agentName = "validator";

    await registerAgent(team, agentName, { model: COMPAT_MODEL });
    await seedInbox(team, agentName, "Hello! Please say a quick hello.");

    paneId = await launchAgent(team, agentName, {
      model: COMPAT_MODEL,
      parentSessionId: team.leadSessionId,
    });

    await waitForAgentIdle(paneId, { timeoutMs: 90_000 });

    const config = await readConfig(team);
    const result = TeamConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe(team.name);
      expect(result.data.leadAgentId).toBe(`team-lead@${team.name}`);
      expect(result.data.members.length).toBeGreaterThanOrEqual(2); // lead + agent
    }
  }, 120_000);
});
