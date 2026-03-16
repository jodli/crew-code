import { defineCommand } from "citty";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { BlueprintSchema } from "../../../config/blueprint-schema.ts";
import { generateSkeleton } from "../../../core/blueprint-skeleton.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "new",
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
    const store = new YamlBlueprintStore();

    if (await store.exists(args.name)) {
      console.error(renderError({ kind: "blueprint_already_exists", name: args.name }));
      process.exit(1);
    }

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
    const result = BlueprintSchema.safeParse(data);
    if (!result.success) {
      const detail = result.error.issues.map((i) => i.message).join(", ");
      console.error(renderError({ kind: "blueprint_invalid", name: args.name, detail }));
      process.exit(1);
    }

    const saveResult = await store.save(result.data);
    if (!saveResult.ok) {
      console.error(renderError(saveResult.error));
      process.exit(1);
    }

    console.error(`Blueprint "${result.data.name}" saved to ${saveResult.value}`);
  },
});
