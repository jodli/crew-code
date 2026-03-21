import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { getCrewMessages } from "../../actions/get-crew-channel.ts";
import { getInbox } from "../../actions/get-inbox.ts";
import { sendMessage } from "../../actions/send-message.ts";
import { claudeInboxPath } from "../../config/paths.ts";
import { watchFile } from "../../lib/file-watcher.ts";
import { CREW_SENDER } from "../../types/constants.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const SendMessageBody = z.object({
  message: z.string(),
  from: z.string().optional(),
});

export function messageRoutes() {
  const r = new Hono<Env>();

  r.get("/teams/:name/agents/:agent/messages", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");
    const status = c.req.query("status");
    const filter = status === "unread" ? { unreadOnly: true } : undefined;
    const result = await getInbox(ctx, name, agent, filter);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams/:name/agents/:agent/messages", zValidator("json", SendMessageBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");
    const body = c.req.valid("json");
    const result = await sendMessage(ctx, {
      team: name,
      agent,
      message: body.message,
      from: body.from ?? CREW_SENDER,
    });
    if (!result.ok) return errorResponse(c, result.error);
    return c.body(null, 201);
  });

  // Crew channel: messages agents sent to crew
  r.get("/teams/:name/messages", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const status = c.req.query("status");
    const filter = status === "unread" ? { unreadOnly: true } : undefined;
    const result = await getCrewMessages(ctx, name, filter);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  // Crew channel SSE: live stream of new messages
  r.get("/teams/:name/messages/stream", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");

    const exists = await ctx.configStore.teamExists(name);
    if (!exists) return errorResponse(c, { kind: "team_not_found", team: name });

    const inboxPath = claudeInboxPath(name, CREW_SENDER);

    return streamSSE(c, async (stream) => {
      let lastSeen = 0;

      // Send initial snapshot
      const initial = await getCrewMessages(ctx, name);
      if (initial.ok) {
        lastSeen = initial.value.totalCount;
        await stream.writeSSE({
          event: "snapshot",
          data: JSON.stringify(initial.value),
          id: String(Date.now()),
        });
      }

      // Watch for changes
      const cleanup = watchFile(inboxPath, async () => {
        try {
          const result = await getCrewMessages(ctx, name);
          if (!result.ok) return;

          const newMessages = result.value.messages.slice(lastSeen);
          if (newMessages.length === 0) return;

          lastSeen = result.value.totalCount;
          await stream.writeSSE({
            event: "message",
            data: JSON.stringify(newMessages),
            id: String(Date.now()),
          });
        } catch {
          // transient errors
        }
      });

      stream.onAbort(() => {
        cleanup();
      });

      // Keep stream alive
      while (true) {
        await stream.sleep(1000);
      }
    });
  });

  return r;
}
