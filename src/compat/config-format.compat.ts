/**
 * Compat test: config.json schema unchanged.
 *
 * After an agent boots and responds, the config.json should still
 * match our expected schema (name, createdAt, leadAgentId, etc.).
 */
import { describe, test, expect, afterEach } from "bun:test";
import { z } from "zod";
import {
  createTestTeam,
  registerAgent,
  seedInbox,
  launchAgent,
  killPane,
  readConfig,
  waitForAgentIdle,
  COMPAT_MODEL,
  type TestTeam,
} from "./helpers.ts";

const AgentMemberSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  agentType: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  color: z.string().optional(),
  planModeRequired: z.boolean().optional(),
  joinedAt: z.number(),
  tmuxPaneId: z.string(),
  cwd: z.string(),
  subscriptions: z.array(z.string()),
  backendType: z.string().optional(),
  isActive: z.boolean().optional(),
});

const TeamConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.number(),
  leadAgentId: z.string(),
  leadSessionId: z.string(),
  members: z.array(AgentMemberSchema),
});

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
