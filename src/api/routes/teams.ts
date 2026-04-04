import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createTeam } from "../../actions/create-team.ts";
import { getTeamDetail } from "../../actions/get-team-detail.ts";
import { listTeams } from "../../actions/list-teams.ts";
import { removeTeam } from "../../actions/remove-team.ts";
import { startTeam } from "../../actions/start-team.ts";
import { updateTeam } from "../../actions/update-team.ts";
import { claudeInboxesDir, claudeTeamConfigPath, processRegistryPath } from "../../config/paths.ts";
import { getCrewMessages } from "../../core/crew-channel.ts";
import { debounce, watchDir, watchFile } from "../../lib/file-watcher.ts";
import { debug } from "../../lib/logger.ts";
import { launchAgent } from "../../runtime/launch.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const CreateTeamBody = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const UpdateTeamBody = z.object({
  description: z.string().optional(),
});

export function teamRoutes() {
  const r = new Hono<Env>();

  r.get("/teams", async (c) => {
    const ctx = c.get("ctx");
    const result = await listTeams(ctx);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams", zValidator("json", CreateTeamBody), async (c) => {
    const ctx = c.get("ctx");
    const body = c.req.valid("json");
    const result = await createTeam(ctx, body);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value, 201);
  });

  r.get("/teams/:name", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const result = await getTeamDetail(ctx, name);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.patch("/teams/:name", zValidator("json", UpdateTeamBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const body = c.req.valid("json");
    const result = await updateTeam(ctx, { team: name, ...body });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.delete("/teams/:name", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const result = await removeTeam(ctx, { team: name });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams/:name/start", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");

    const result = await startTeam(ctx, { team: name });
    if (!result.ok) return errorResponse(c, result.error);

    const activeResult = ctx.processRegistry ? await ctx.processRegistry.listActive(name) : { ok: true, value: [] };
    const activeIds = new Set(
      activeResult.ok ? (activeResult.value as Array<{ agentId: string }>).map((e) => e.agentId) : [],
    );

    const started: Array<{ name: string; pid: number }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    for (const agent of result.value.agents) {
      if (activeIds.has(agent.agentId)) {
        skipped.push({ name: agent.name, reason: "already running" });
        continue;
      }
      try {
        const { pid } = launchAgent(agent.launchOptions, { headless: true });
        if (ctx.processRegistry) {
          await ctx.processRegistry.activate(name, agent.agentId, pid, "headless");
        }
        started.push({ name: agent.name, pid });
      } catch (e: unknown) {
        skipped.push({ name: agent.name, reason: e instanceof Error ? e.message : String(e) });
      }
    }

    for (const s of result.value.skipped) {
      skipped.push(s);
    }

    return c.json({ started, skipped, tmuxSession: `crew_${name}` });
  });

  r.get("/teams/:name/stream", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    let lastTeamJson = "";
    let lastMessagesJson = "";

    return streamSSE(c, async (stream) => {
      const pushTeamUpdate = async () => {
        try {
          const result = await getTeamDetail(ctx, name);
          if (!result.ok) return;
          const json = JSON.stringify(result.value);
          if (json !== lastTeamJson) {
            lastTeamJson = json;
            await stream.writeSSE({ event: "team-update", data: json });
          }
        } catch (e: unknown) {
          debug("sse", `team stream error for ${name}`, { error: String(e) });
        }
      };

      const pushMessagesUpdate = async () => {
        try {
          const result = await getCrewMessages(ctx, name);
          if (!result.ok) return;
          const json = JSON.stringify(result.value);
          if (json !== lastMessagesJson) {
            lastMessagesJson = json;
            await stream.writeSSE({ event: "crew-messages", data: json });
          }
        } catch (e: unknown) {
          debug("sse", `crew messages stream error for ${name}`, { error: String(e) });
        }
      };

      const pushAll = async () => {
        await pushTeamUpdate();
        await pushMessagesUpdate();
      };

      // Send initial snapshots
      await pushAll();

      // Watch for changes
      const debouncedPushAll = debounce(pushAll, 200);
      const cleanups: (() => void)[] = [];
      try {
        cleanups.push(watchFile(claudeTeamConfigPath(name), () => debouncedPushAll()));
      } catch {
        /* file may not exist */
      }
      try {
        cleanups.push(watchDir(claudeInboxesDir(name), () => debouncedPushAll()));
      } catch {
        /* dir may not exist */
      }
      try {
        cleanups.push(watchFile(processRegistryPath(name), () => debouncedPushAll()));
      } catch {
        /* file may not exist */
      }
      stream.onAbort(() => {
        for (const c of cleanups) c();
      });

      // Keep stream alive
      while (true) {
        await stream.sleep(1000);
      }
    });
  });

  return r;
}
