import { defineCommand } from "citty";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse, stringify } from "yaml";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { getBlueprint } from "../../../actions/get-blueprint.ts";
import { updateBlueprint } from "../../../actions/update-blueprint.ts";
import { renderError } from "../../errors.ts";
import type { AppContext } from "../../../types/context.ts";

export default defineCommand({
  meta: {
    name: "update",
    description: "Update an existing blueprint",
  },
  args: {
    name: {
      type: "positional",
      description: "Blueprint name",
      required: true,
    },
    description: {
      type: "string",
      alias: "d",
      description: "Update description (inline, no editor)",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    // Inline mode: just update description
    if (args.description !== undefined) {
      const result = await updateBlueprint(ctx, {
        name: args.name,
        description: args.description,
      });
      if (!result.ok) {
        console.error(renderError(result.error));
        process.exit(1);
      }
      console.error(`Blueprint "${args.name}" updated.`);
      return;
    }

    // Editor mode: load → edit → save
    const loadResult = await getBlueprint(ctx, args.name);
    if (!loadResult.ok) {
      console.error(renderError(loadResult.error));
      process.exit(1);
    }

    const content = stringify(loadResult.value);
    const tempPath = join(tmpdir(), `crew-blueprint-${args.name}-${Date.now()}.yaml`);
    await writeFile(tempPath, content, "utf-8");

    const editor = process.env.EDITOR || "vi";
    const proc = Bun.spawn([editor, tempPath], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      console.error("Editor exited with non-zero code. Blueprint not updated.");
      await unlink(tempPath).catch(() => {});
      process.exit(1);
    }

    const edited = await readFile(tempPath, "utf-8");
    await unlink(tempPath).catch(() => {});

    const data = parse(edited);
    const result = await updateBlueprint(ctx, {
      name: args.name,
      description: data.description,
      agents: data.agents,
    });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Blueprint "${args.name}" updated.`);
  },
});
