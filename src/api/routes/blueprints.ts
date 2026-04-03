import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createBlueprint } from "../../actions/create-blueprint.ts";
import { exportTeamAsBlueprint } from "../../actions/export-team-as-blueprint.ts";
import { getBlueprint } from "../../actions/get-blueprint.ts";
import { listBlueprintsDetailed } from "../../actions/list-blueprints.ts";
import { executeLoad, planLoad } from "../../actions/load-blueprint.ts";
import { updateBlueprint } from "../../actions/update-blueprint.ts";
import { BlueprintSchema } from "../../config/blueprint-schema.ts";
import { errorResponse } from "../errors.ts";
import type { Env } from "../server.ts";

const FromTeamBody = z.object({ fromTeam: z.string() });
const CreateBlueprintBody = z.union([BlueprintSchema, FromTeamBody]);

const UpdateBlueprintBody = z.object({
  description: z.string().optional(),
  agents: BlueprintSchema.shape.agents.optional(),
});

const LoadBody = z.object({
  teamName: z.string().optional(),
});

export function blueprintRoutes() {
  const r = new Hono<Env>();

  r.get("/blueprints", async (c) => {
    const ctx = c.get("ctx");
    const result = await listBlueprintsDetailed(ctx);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.get("/blueprints/:name", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const result = await getBlueprint(ctx, name);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/blueprints", zValidator("json", CreateBlueprintBody), async (c) => {
    const ctx = c.get("ctx");
    const body = c.req.valid("json");

    if ("fromTeam" in body) {
      const exportResult = await exportTeamAsBlueprint(ctx, { team: body.fromTeam });
      if (!exportResult.ok) return errorResponse(c, exportResult.error);
      const saveResult = await createBlueprint(ctx, exportResult.value, { overwrite: true });
      if (!saveResult.ok) return errorResponse(c, saveResult.error);
      return c.json(exportResult.value, 201);
    }

    const result = await createBlueprint(ctx, body);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json({ name: body.name, path: result.value }, 201);
  });

  r.patch("/blueprints/:name", zValidator("json", UpdateBlueprintBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const body = c.req.valid("json");
    const result = await updateBlueprint(ctx, { name, ...body });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  r.post("/blueprints/:name/load", zValidator("json", LoadBody), async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const body = c.req.valid("json");
    const plan = await planLoad(ctx, { nameOrPath: name, teamName: body.teamName });
    if (!plan.ok) return errorResponse(c, plan.error);
    const result = await executeLoad(ctx, plan.value);
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value, 201);
  });

  r.get("/teams/:name/blueprint", async (c) => {
    const ctx = c.get("ctx");
    const name = c.req.param("name");
    const result = await exportTeamAsBlueprint(ctx, { team: name });
    if (!result.ok) return errorResponse(c, result.error);
    return c.json(result.value);
  });

  return r;
}
