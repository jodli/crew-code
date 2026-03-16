import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { stringify, parse } from "yaml";
import type { BlueprintStore } from "../ports/blueprint-store.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";
import { BlueprintSchema } from "../config/blueprint-schema.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import { blueprintsDir as defaultBlueprintsDir } from "../config/paths.ts";

function isFilePath(nameOrPath: string): boolean {
  return nameOrPath.includes("/") || nameOrPath.endsWith(".yaml") || nameOrPath.endsWith(".yml");
}

export class YamlBlueprintStore implements BlueprintStore {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? defaultBlueprintsDir();
  }

  async load(nameOrPath: string): Promise<Result<Blueprint>> {
    const filePath = isFilePath(nameOrPath)
      ? nameOrPath
      : join(this.dir, `${nameOrPath}.yaml`);

    if (!existsSync(filePath)) {
      return err({ kind: "blueprint_not_found", name: nameOrPath });
    }

    try {
      const content = await readFile(filePath, "utf-8");
      const data = parse(content);
      const result = BlueprintSchema.safeParse(data);
      if (!result.success) {
        return err({
          kind: "blueprint_invalid",
          name: nameOrPath,
          detail: result.error.issues.map((i) => i.message).join(", "),
        });
      }
      return ok(result.data);
    } catch (e: any) {
      return err({ kind: "blueprint_invalid", name: nameOrPath, detail: e.message });
    }
  }

  async save(blueprint: Blueprint): Promise<Result<string>> {
    await mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, `${blueprint.name}.yaml`);
    const content = stringify(blueprint);
    await writeFile(filePath, content, "utf-8");
    return ok(filePath);
  }

  async list(): Promise<Result<string[]>> {
    if (!existsSync(this.dir)) {
      return ok([]);
    }

    const entries = await readdir(this.dir);
    const names = entries
      .filter((e) => e.endsWith(".yaml") || e.endsWith(".yml"))
      .map((e) => basename(e, e.endsWith(".yml") ? ".yml" : ".yaml"));
    return ok(names);
  }

  async exists(name: string): Promise<boolean> {
    return existsSync(join(this.dir, `${name}.yaml`));
  }
}
