import { defineCommand } from "citty";
import { writeFile } from "node:fs/promises";
import { stringify } from "yaml";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { exportTeamAsBlueprint } from "../../../actions/export-team-as-blueprint.ts";
import { createBlueprint } from "../../../actions/create-blueprint.ts";
import { renderError } from "../../errors.ts";
import type { AppContext } from "../../../types/context.ts";

export default defineCommand({
  meta: {
    name: "save",
    description: "Export a running team as a blueprint",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name to export",
      required: true,
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output file path (default: save to blueprints dir)",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    const exportResult = await exportTeamAsBlueprint(ctx, { team: args.team });
    if (!exportResult.ok) {
      console.error(renderError(exportResult.error));
      process.exit(1);
    }

    const blueprint = exportResult.value;

    if (args.output) {
      const content = stringify(blueprint);
      await writeFile(args.output, content, "utf-8");
      console.error(`Blueprint saved to ${args.output}`);
    } else {
      const saveResult = await createBlueprint(ctx, blueprint, { overwrite: true });
      if (!saveResult.ok) {
        console.error(renderError(saveResult.error));
        process.exit(1);
      }
      console.error(`Blueprint "${blueprint.name}" saved to ${saveResult.value}`);
    }
  },
});
