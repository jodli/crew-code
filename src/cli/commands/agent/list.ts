import { defineCommand } from "citty";
import Table from "cli-table3";
import pc from "picocolors";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { getTeamDetail } from "../../../core/status.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "list",
    description: "List agents in a team with detailed status",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
  },
  async run({ args }) {
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const result = await getTeamDetail(ctx, args.team);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    // Get live agent IDs from registry
    const runningAgentIds = new Set<string>();
    const activeResult = await processRegistry.listActive(args.team);
    if (activeResult.ok) {
      for (const entry of activeResult.value) {
        runningAgentIds.add(entry.agentId);
      }
    }

    const detail = result.value;
    console.error(`${pc.bold(detail.name)}${detail.description ? ` — ${detail.description}` : ""}`);

    const table = new Table({
      head: ["Name", "Status", "Session", "Unread", "CWD"],
      style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
    });

    const home = process.env.HOME ?? "";
    for (const m of detail.members) {
      const running = runningAgentIds.has(m.agentId);
      const status = running ? pc.green("running") : pc.dim("stopped");
      table.push([
        m.name,
        status,
        m.sessionId ?? "-",
        m.unreadCount > 0 ? pc.yellow(String(m.unreadCount)) : "0",
        home ? m.cwd.replace(home, "~") : m.cwd,
      ]);
    }

    console.log(table.toString());
  },
});
