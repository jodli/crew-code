import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineCommand } from "citty";
import { parse } from "yaml";
import { createBlueprint } from "../../../actions/create-blueprint.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { generateSkeleton } from "../../../core/blueprint-skeleton.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "create",
    description: "Create a new blueprint in $EDITOR",
  },
  args: {
    name: {
      type: "positional",
      description: "Blueprint name",
      required: true,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    const skeleton = generateSkeleton(args.name);
    const tempPath = join(tmpdir(), `crew-blueprint-${args.name}-${Date.now()}.yaml`);
    await writeFile(tempPath, skeleton, "utf-8");

    const editor = process.env.EDITOR || "vi";
    const proc = Bun.spawn([editor, tempPath], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      console.error("Editor exited with non-zero code. Blueprint not saved.");
      await unlink(tempPath).catch(() => {});
      process.exit(1);
    }

    const content = await readFile(tempPath, "utf-8");
    await unlink(tempPath).catch(() => {});

    const data = parse(content);
    const result = await createBlueprint(ctx, data);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Blueprint "${args.name}" saved to ${result.value}`);
  },
});
