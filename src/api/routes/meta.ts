import { Hono } from "hono";
import { discoverAgentTypes } from "../../lib/discover-agent-types.ts";
import { MODEL_OPTIONS } from "../../lib/model-options.ts";
import type { Env } from "../server.ts";

export function metaRoutes() {
  const r = new Hono<Env>();

  r.get("/agent-types", async (c) => {
    const types = await discoverAgentTypes();
    return c.json(types);
  });

  r.get("/models", (c) => {
    return c.json([...MODEL_OPTIONS]);
  });

  return r;
}
