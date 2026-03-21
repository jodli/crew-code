import { defineCommand } from "citty";
import Table from "cli-table3";
import pc from "picocolors";
import { FileProcessRegistry } from "../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { getTeamDetail, listTeams } from "../../core/status.ts";
import type { AppContext } from "../../types/context.ts";
import { renderError } from "../errors.ts";

export default defineCommand({
  meta: {
    name: "status",
    description: "Show team and agent status",
  },
  args: {
    team: {
      type: "string",
      description: "Show detailed status for a specific team",
      required: false,
    },
  },
  async run({ args }) {
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    if (args.team) {
      const result = await getTeamDetail(ctx, args.team);
      if (!result.ok) {
        console.error(renderError(result.error));
        process.exit(1);
      }

      // Get live agent IDs from registry
      const liveAgentIds = new Set<string>();
      const activeResult = await processRegistry.listActive(args.team);
      if (activeResult.ok) {
        for (const entry of activeResult.value) {
          liveAgentIds.add(entry.agentId);
        }
      }

      const detail = result.value;
      console.error(`${pc.bold(detail.name)}${detail.description ? ` — ${detail.description}` : ""}`);

      const table = new Table({
        head: ["Agent", "Status", "Session", "Unread", "CWD"],
        style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
      });

      const home = process.env.HOME ?? "";
      for (const m of detail.members) {
        const alive = liveAgentIds.has(m.agentId);
        const status = alive ? pc.green("live") : pc.dim("gone");
        table.push([
          m.name,
          status,
          m.sessionId ?? "-",
          m.unreadCount > 0 ? pc.yellow(String(m.unreadCount)) : "0",
          home ? m.cwd.replace(home, "~") : m.cwd,
        ]);
      }

      console.log(table.toString());
      return;
    }

    // Summary mode: list all teams
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
      head: ["Team", "Description", "Members"],
      style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
    });

    for (const t of result.value) {
      table.push([t.name, t.description ?? "", String(t.memberCount)]);
    }

    console.log(table.toString());
  },
});
