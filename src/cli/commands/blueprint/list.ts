import { defineCommand } from "citty";
import Table from "cli-table3";
import { YamlBlueprintStore } from "../../../adapters/yaml-blueprint-store.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "list",
    description: "List available blueprints",
  },
  async run() {
    const store = new YamlBlueprintStore();

    const namesResult = await store.list();
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
      const bp = await store.load(name);
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
