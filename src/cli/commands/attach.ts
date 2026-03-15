import { defineCommand } from "citty";
import pc from "picocolors";
import { attachAgent } from "../../actions/attach-agent.ts";
import { launchClaude } from "../../lib/exec-claude.ts";
import { activateAgent } from "../../core/spawn.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { renderError } from "../errors.ts";
import { parsePassthroughArgs } from "../../lib/parse-passthrough-args.ts";
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
  async run({ args, rawArgs }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
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

    result.value.launchOptions.extraArgs = parsePassthroughArgs(rawArgs);
    const { pid, exited } = launchClaude(result.value.launchOptions, { mode: "resume" });
    await activateAgent(ctx, args.team, result.value.agentId, String(pid));
    const code = await exited;
    process.exit(code);
  },
});
