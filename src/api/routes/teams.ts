import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createTeam } from "../../actions/create-team.ts";
import { getTeamDetail } from "../../actions/get-team-detail.ts";
import { listTeams } from "../../actions/list-teams.ts";
import { removeTeam } from "../../actions/remove-team.ts";
import { updateTeam } from "../../actions/update-team.ts";
import { claudeInboxesDir, claudeTeamConfigPath, processRegistryPath } from "../../config/paths.ts";
import { debounce, watchDir, watchFile } from "../../lib/file-watcher.ts";
import { debug } from "../../lib/logger.ts";
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

  r.get("/teams/:name/stream", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    let lastJson = "";

    return streamSSE(c, async (stream) => {
      const pushUpdate = async () => {
        try {
          const result = await getTeamDetail(ctx, name);
          if (!result.ok) return;
          const json = JSON.stringify(result.value);
          if (json !== lastJson) {
            lastJson = json;
            await stream.writeSSE({ event: "team-update", data: json });
          }
        } catch (e: unknown) {
          debug("sse", `team stream error for ${name}`, { error: String(e) });
        }
      };

      // Send initial snapshot
      await pushUpdate();

      // Watch for changes
      const debouncedPush = debounce(pushUpdate, 200);
      const cleanups: (() => void)[] = [];
      try {
        cleanups.push(watchFile(claudeTeamConfigPath(name), () => debouncedPush()));
      } catch {
        /* file may not exist */
      }
      try {
        cleanups.push(watchDir(claudeInboxesDir(name), () => debouncedPush()));
      } catch {
        /* dir may not exist */
      }
      try {
        cleanups.push(watchFile(processRegistryPath(name), () => debouncedPush()));
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
