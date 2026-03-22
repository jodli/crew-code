import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createAgent } from "../../actions/create-agent.ts";
import { listAgents } from "../../actions/list-agents.ts";
import { removeAgent } from "../../actions/remove-agent.ts";
import { startAgent } from "../../actions/start-agent.ts";
import { stopAgent } from "../../actions/stop-agent.ts";
import { updateAgent } from "../../actions/update-agent.ts";
import { launchAgent } from "../../runtime/launch.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const SpawnAgentBody = z.object({
  name: z.string().optional(),
  agentType: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
});

const UpdateAgentBody = z.object({
  model: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
});

export function agentRoutes() {
  const r = new Hono<Env>();

  r.get("/teams/:name/agents", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const result = await listAgents(ctx, name);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams/:name/agents", zValidator("json", SpawnAgentBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const body = c.req.valid("json");
    const result = await createAgent(ctx, { team: name, ...body });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value, 201);
  });

  r.patch("/teams/:name/agents/:agent", zValidator("json", UpdateAgentBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");
    const body = c.req.valid("json");
    const result = await updateAgent(ctx, { team: name, name: agent, ...body });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams/:name/agents/:agent/stop", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");

    const teamResult = await ctx.configStore.getTeam(name);
    if (!teamResult.ok) return errorResponse(c, teamResult.error);

    const config = teamResult.value;
    const member = config.members.find((m) => m.name === agent);
    if (!member) {
      return errorResponse(c, { kind: "agent_not_found", agent, team: name });
    }

    const result = await stopAgent(ctx.processRegistry, name, member.agentId);
    if (!result.ok) return errorResponse(c, result.error);

    return c.json({ stopped: result.value });
  });

  r.post("/teams/:name/agents/:agent/start", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");

    const teamResult = await ctx.configStore.getTeam(name);
    if (!teamResult.ok) return errorResponse(c, teamResult.error);

    const config = teamResult.value;
    const member = config.members.find((m) => m.name === agent);
    if (!member) {
      return errorResponse(c, { kind: "agent_not_found", agent, team: name });
    }

    if (ctx.processRegistry) {
      const running = await ctx.processRegistry.isRunning(name, member.agentId);
      if (running) {
        return c.json({ error: { kind: "already_running", message: `Agent "${agent}" is already running` } }, 409);
      }
    }

    const result = await startAgent(ctx, { team: name, name: agent });
    if (!result.ok) return errorResponse(c, result.error);

    const { pid } = launchAgent(result.value.launchOptions, { headless: true });
    const tmuxSession = `crew_${name}_${agent}`;

    if (ctx.processRegistry) {
      await ctx.processRegistry.activate(name, member.agentId, pid);
    }

    return c.json({ started: true, pid, tmuxSession });
  });

  r.delete("/teams/:name/agents/:agent", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");
    const result = await removeAgent(ctx, { team: name, name: agent });
    if (!result.ok) return errorResponse(c, result.error);
    return c.body(null, 204);
  });

  return r;
}
