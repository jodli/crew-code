import { defineCommand } from "citty";
import Table from "cli-table3";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { listTeams } from "../../../core/status.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "list",
    description: "List all teams",
  },
  args: {},
  async run() {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await listTeams(ctx);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    if (result.value.length === 0) {
      console.error("No teams found.");
      return;
    }

    const table = new Table({
      head: ["Name", "Description", "Members"],
      style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
    });

    for (const t of result.value) {
      table.push([t.name, t.description ?? "", String(t.memberCount)]);
    }

    console.log(table.toString());
  },
});
