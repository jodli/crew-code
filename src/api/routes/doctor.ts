import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { applyFixes, diagnose } from "../../actions/diagnose.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const FixBody = z
  .object({
    team: z.string().optional(),
  })
  .optional();

export function doctorRoutes() {
  const r = new Hono<Env>();

  r.get("/doctor", async (c) => {
    const ctx = c.get("ctx");
    const team = c.req.query("team");
    const result = await diagnose(ctx, { team });
    if (!result.ok) return errorResponse(c, result.error);
    const serialized = result.value.map(({ fix, ...rest }) => rest);
    return c.json(serialized);
  });

  r.post("/doctor/fix", zValidator("json", FixBody), async (c) => {
    const ctx = c.get("ctx");
    const body = c.req.valid("json");
    const diagResult = await diagnose(ctx, { team: body?.team });
    if (!diagResult.ok) return errorResponse(c, diagResult.error);
    const fixResult = await applyFixes(ctx, diagResult.value);
    if (!fixResult.ok) return errorResponse(c, fixResult.error);
    return c.json(fixResult.value);
  });

  return r;
}
