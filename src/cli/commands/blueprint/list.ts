import { defineCommand } from "citty";
import Table from "cli-table3";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { listBlueprints } from "../../../actions/list-blueprints.ts";
import { getBlueprint } from "../../../actions/get-blueprint.ts";
import { renderError } from "../../errors.ts";
import type { AppContext } from "../../../types/context.ts";

export default defineCommand({
  meta: {
    name: "list",
    description: "List available blueprints",
  },
  async run() {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
    };

    const namesResult = await listBlueprints(ctx);
    if (!namesResult.ok) {
      console.error(renderError(namesResult.error));
      process.exit(1);
    }

    if (namesResult.value.length === 0) {
      console.error("No blueprints found.");
      return;
    }

    const table = new Table({
      head: ["Name", "Description", "Agents"],
      style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
    });

    for (const name of namesResult.value) {
      const bp = await getBlueprint(ctx, name);
      if (bp.ok) {
        table.push([
          bp.value.name,
          bp.value.description ?? "",
          String(bp.value.agents.length),
        ]);
      }
    }

    console.log(table.toString());
  },
});
