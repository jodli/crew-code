import { defineCommand } from "citty";
import pc from "picocolors";
import { attachAgent } from "../../actions/attach-agent.ts";
import { FileProcessRegistry } from "../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { parsePassthroughArgs } from "../../lib/parse-passthrough-args.ts";
import { launchAgent } from "../../runtime/launch.ts";
import type { AppContext } from "../../types/context.ts";
import { renderError } from "../errors.ts";

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
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const result = await attachAgent(ctx, {
      team: args.team,
      name: args.name || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Attaching as ${pc.bold(result.value.name)} to ${pc.bold(args.team)}...`);
    console.error(`  Resuming session ${result.value.launchOptions.sessionId}\n`);

    const cliArgs = parsePassthroughArgs(rawArgs);
    if (cliArgs.length > 0) {
      result.value.launchOptions.extraArgs = cliArgs;
      await ctx.configStore.updateTeam(args.team, (cfg) => ({
        ...cfg,
        members: cfg.members.map((m) => (m.agentId === result.value.agentId ? { ...m, extraArgs: cliArgs } : m)),
      }));
    }
    const { pid, exited } = launchAgent(result.value.launchOptions);
    const activateResult = await processRegistry.activate(args.team, result.value.agentId, pid);
    if (!activateResult.ok) {
      console.error(
        `Warning: failed to register process: ${"detail" in activateResult.error ? activateResult.error.detail : activateResult.error.kind}`,
      );
    }
    const code = await exited;
    process.exit(code);
  },
});
