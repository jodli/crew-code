import { defineCommand } from "citty";
import pc from "picocolors";
import Table from "cli-table3";
import { listTeams, getTeamDetail } from "../../core/status.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { TmuxLauncher } from "../../adapters/tmux-launcher.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

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
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      launcher: new TmuxLauncher(),
    };

    if (args.team) {
      const result = await getTeamDetail(ctx, args.team);
      if (!result.ok) {
        console.error(renderError(result.error));
        process.exit(1);
      }

      const detail = result.value;
      console.error(
        `${pc.bold(detail.name)}${detail.description ? ` — ${detail.description}` : ""}`,
      );

      const table = new Table({
        head: ["Agent", "Active", "Unread"],
        style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
      });

      for (const m of detail.members) {
        table.push([
          m.name,
          m.isActive ? pc.green("yes") : "no",
          m.unreadCount > 0 ? pc.yellow(String(m.unreadCount)) : "0",
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
      head: ["Team", "Description", "Members", "Active"],
      style: { head: process.env.NO_COLOR ? [] : ["cyan"] },
    });

    for (const t of result.value) {
      table.push([
        t.name,
        t.description ?? "",
        String(t.memberCount),
        String(t.activeCount),
      ]);
    }

    console.log(table.toString());
  },
});
