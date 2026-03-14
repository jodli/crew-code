import { defineCommand } from "citty";
import pc from "picocolors";
import { attachAgent } from "../../core/attach.ts";
import { execClaude } from "../../lib/exec-claude.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { TmuxLauncher } from "../../adapters/tmux-launcher.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

export default defineCommand({
  meta: {
    name: "attach",
    description: "Re-attach to an existing agent session in a team",
  },
  args: {
    team: {
      type: "string",
      description: "Team name to attach to",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name to attach as (defaults to team-lead)",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      launcher: new TmuxLauncher(),
    };

    const result = await attachAgent(ctx, {
      team: args.team,
      name: args.name || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(
      `Attaching as ${pc.bold(result.value.name)} to ${pc.bold(args.team)}...`,
    );
    console.error(`  Resuming session ${result.value.launchOptions.sessionId}\n`);

    await execClaude(result.value.launchOptions, { mode: "resume" });
  },
});
