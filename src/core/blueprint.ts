import type { Blueprint, BlueprintAgent } from "../config/blueprint-schema.ts";
import { BlueprintSchema } from "../config/blueprint-schema.ts";
import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";
import { teamToBlueprint } from "./blueprint-export.ts";

function requireBlueprintStore(ctx: AppContext) {
  if (!ctx.blueprintStore) {
    return err({ kind: "launch_failed" as const, detail: "BlueprintStore not configured" });
  }
  return ok(ctx.blueprintStore);
}

export async function listBlueprints(ctx: AppContext): Promise<Result<string[]>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  return storeResult.value.list();
}

export async function listBlueprintsDetailed(ctx: AppContext): Promise<Result<Blueprint[]>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  const store = storeResult.value;

  const namesResult = await store.list();
  if (!namesResult.ok) return namesResult;

  const blueprints: Blueprint[] = [];
  for (const name of namesResult.value) {
    const bp = await store.load(name);
    if (bp.ok) blueprints.push(bp.value);
  }
  return ok(blueprints);
}

export async function getBlueprint(ctx: AppContext, name: string): Promise<Result<Blueprint>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  return storeResult.value.load(name);
}

export async function createBlueprint(
  ctx: AppContext,
  blueprint: Blueprint,
  opts?: { overwrite?: boolean },
): Promise<Result<string>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  const store = storeResult.value;

  const parseResult = BlueprintSchema.safeParse(blueprint);
  if (!parseResult.success) {
    const detail = parseResult.error.issues.map((i) => i.message).join(", ");
    return err({ kind: "blueprint_invalid", name: blueprint.name ?? "unknown", detail });
  }

  if (!opts?.overwrite && (await store.exists(parseResult.data.name))) {
    return err({ kind: "blueprint_already_exists", name: parseResult.data.name });
  }

  return store.save(parseResult.data);
}

export interface UpdateBlueprintInput {
  name: string;
  description?: string;
  agents?: BlueprintAgent[];
}

export async function updateBlueprint(ctx: AppContext, input: UpdateBlueprintInput): Promise<Result<Blueprint>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  const store = storeResult.value;

  const loadResult = await store.load(input.name);
  if (!loadResult.ok) return loadResult;

  const merged: Blueprint = {
    ...loadResult.value,
    ...(input.description !== undefined && { description: input.description }),
    ...(input.agents !== undefined && { agents: input.agents }),
  };

  const parseResult = BlueprintSchema.safeParse(merged);
  if (!parseResult.success) {
    const detail = parseResult.error.issues.map((i) => i.message).join(", ");
    return err({ kind: "blueprint_invalid", name: input.name, detail });
  }

  const saveResult = await store.save(parseResult.data);
  if (!saveResult.ok) return saveResult;

  return ok(parseResult.data);
}

export async function deleteBlueprint(ctx: AppContext, name: string): Promise<Result<void>> {
  const storeResult = requireBlueprintStore(ctx);
  if (!storeResult.ok) return storeResult;
  return storeResult.value.delete(name);
}

export async function exportTeamAsBlueprint(ctx: AppContext, input: { team: string }): Promise<Result<Blueprint>> {
  const teamResult = await ctx.configStore.getTeam(input.team);
  if (!teamResult.ok) return teamResult;

  return ok(teamToBlueprint(teamResult.value));
}
