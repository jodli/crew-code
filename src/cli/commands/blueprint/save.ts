import { defineCommand } from "citty";
import { writeFile } from "node:fs/promises";
import { stringify } from "yaml";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { teamToBlueprint } from "../../../core/blueprint-export.ts";
import { renderError } from "../../errors.ts";

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
    const configStore = new JsonFileConfigStore();

    const teamResult = await configStore.getTeam(args.team);
    if (!teamResult.ok) {
      console.error(renderError(teamResult.error));
      process.exit(1);
    }

    const blueprint = teamToBlueprint(teamResult.value);

    if (args.output) {
      const content = stringify(blueprint);
      await writeFile(args.output, content, "utf-8");
      console.error(`Blueprint saved to ${args.output}`);
    } else {
      const store = new YamlBlueprintStore();
      const saveResult = await store.save(blueprint);
      if (!saveResult.ok) {
        console.error(renderError(saveResult.error));
        process.exit(1);
      }
      console.error(`Blueprint "${blueprint.name}" saved to ${saveResult.value}`);
    }
  },
});
