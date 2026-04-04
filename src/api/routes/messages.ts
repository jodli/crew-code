import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getCrewMessages } from "../../actions/get-crew-channel.ts";
import { getInbox } from "../../actions/get-inbox.ts";
import { sendMessage } from "../../actions/send-message.ts";
import { CREW_SENDER } from "../../types/constants.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const SendMessageBody = z.object({
  message: z.string(),
  from: z.string().optional(),
});

export function messageRoutes() {
  const r = new Hono<Env>();

  r.get("/teams/:name/agents/:agent/inbox", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const agent = c.req.param("agent");
    const status = c.req.query("status");
    const filter = status === "unread" ? { unreadOnly: true } : undefined;
    const result = await getInbox(ctx, name, agent, filter);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/teams/:name/agents/:agent/inbox", zValidator("json", SendMessageBody), async (c) => {
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

  return r;
}
